#!/usr/bin/env node
/**
 * Sincroniza la tasa BCV en tasas_cambio + exchange_rate.
 * Uso: node scripts/sync-bcv-rate.mjs
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

const BCV_API_ENDPOINTS = [
  "https://ve.dolarapi.com/v1/dolares/oficial",
  "https://bcv.today/api/v1/rate.json",
];

function parseNumericRate(value) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.includes(",")) {
      const normalized = trimmed.replace(/\./g, "").replace(",", ".");
      const parsed = Number.parseFloat(normalized);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
      return null;
    }
    const parsed = Number.parseFloat(trimmed.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function parseSourceEffectiveDate(payload) {
  if (!payload || typeof payload !== "object") return null;
  const candidates = [
    payload.effective_date,
    payload.date,
    payload.fecha,
    payload.fechaActualizacion,
    payload.fecha_actualizacion,
    payload.updated_at,
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== "string" || !candidate.trim()) continue;
    const match = candidate.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  return null;
}

function extractRate(payload) {
  if (!payload || typeof payload !== "object") return null;
  const direct = [
    payload.USD,
    payload.price,
    payload.tasa,
    payload.rate,
    payload.valor,
    payload.value,
    payload.promedio,
    payload.monto,
    payload.mid,
  ];
  for (const candidate of direct) {
    const parsed = parseNumericRate(candidate);
    if (parsed) return parsed;
  }
  if (payload.usd && typeof payload.usd === "object") {
    const parsed = parseNumericRate(
      payload.usd.price ?? payload.usd.valor ?? payload.usd.value ?? payload.usd.tasa,
    );
    if (parsed) return parsed;
  }
  if (payload.dolar && typeof payload.dolar === "object") {
    const parsed = parseNumericRate(
      payload.dolar.value ?? payload.dolar.valor ?? payload.dolar.price,
    );
    if (parsed) return parsed;
  }
  return null;
}

function selectFreshestBcvRate(candidates, reference = new Date()) {
  if (candidates.length === 0) return null;
  const today = getVenezuelaSyncDate(reference);
  const scored = candidates.map((candidate) => {
    const date = candidate.sourceEffectiveDate?.trim() ?? "";
    let freshness = 0;
    if (date === today) freshness = 400;
    else if (/^\d{4}-\d{2}-\d{2}$/.test(date) && date > today) freshness = 300;
    else if (/^\d{4}-\d{2}-\d{2}$/.test(date) && date < today) freshness = 100;
    else freshness = 150;
    return { candidate, freshness, date };
  });
  scored.sort((a, b) => {
    if (b.freshness !== a.freshness) return b.freshness - a.freshness;
    if (a.date && b.date && a.date !== b.date) return b.date.localeCompare(a.date);
    return 0;
  });
  return scored[0]?.candidate ?? null;
}

async function fetchBcvUsdRate() {
  const errors = [];
  const candidates = [];
  const results = await Promise.allSettled(
    BCV_API_ENDPOINTS.map(async (endpoint) => {
      const response = await fetch(endpoint, {
        headers: { Accept: "application/json", "User-Agent": "AlcentimoBCVSync/1.0" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const rate = extractRate(payload);
      if (!rate) throw new Error("sin tasa válida");
      return {
        rate: Math.round((rate + Number.EPSILON) * 100) / 100,
        sourceEffectiveDate: parseSourceEffectiveDate(payload),
        source: endpoint,
      };
    }),
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") candidates.push(result.value);
    else {
      errors.push(
        `${BCV_API_ENDPOINTS[i]}: ${result.reason instanceof Error ? result.reason.message : "error"}`,
      );
    }
  }

  const best = selectFreshestBcvRate(candidates);
  if (best) return best;
  throw new Error(errors.join(" | ") || "No se pudo obtener la tasa BCV.");
}

function getVenezuelaSyncDate(reference = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(reference);
}

async function logSyncAttempt(admin, { syncDate, success, rate, error }) {
  await admin.from("tasas_cambio_sync_logs").insert({
    sync_date: syncDate,
    slot: "manual",
    status: success ? "success" : "failure",
    rate: success ? rate : null,
    error_message: success ? null : error,
  });
}

async function resolveBcvAlerts(admin, syncDate) {
  await admin
    .from("platform_alerts")
    .update({ resolved_at: new Date().toISOString() })
    .eq("alert_type", "bcv_sync_failure")
    .eq("sync_date", syncDate)
    .is("resolved_at", null);
}

async function upsertExchangeRateForDate(admin, { rate, effectiveDate, notes }) {
  const { data: existingRate } = await admin
    .from("exchange_rate")
    .select("id")
    .is("store_id", null)
    .eq("effective_date", effectiveDate)
    .maybeSingle();

  if (existingRate?.id) {
    const { error } = await admin
      .from("exchange_rate")
      .update({
        rate,
        source: "bcv",
        notes,
      })
      .eq("id", existingRate.id);
    return error;
  }

  const { error } = await admin.from("exchange_rate").insert({
    rate,
    source: "bcv",
    effective_date: effectiveDate,
    store_id: null,
    notes,
  });
  return error;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const fetched = await fetchBcvUsdRate();
  const rate = fetched.rate;
  if (!Number.isFinite(rate) || rate <= 0) {
    console.error("La API BCV devolvió una tasa nula o inválida.");
    process.exit(1);
  }

  const updatedAt = new Date().toISOString();
  const syncDate = getVenezuelaSyncDate();
  // Vigencia estricta de la API (viernes→lunes incluido). Sin fecha → hoy.
  const sourceDate = fetched.sourceEffectiveDate;
  const effectiveDate =
    typeof sourceDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sourceDate)
      ? sourceDate
      : syncDate;
  const admin = createClient(url, serviceRoleKey);

  const writeError = await upsertExchangeRateForDate(admin, {
    rate,
    effectiveDate,
    notes: `Actualización manual (script sync-bcv-rate, vigencia ${effectiveDate})`,
  });

  if (writeError) {
    await logSyncAttempt(admin, {
      syncDate,
      success: false,
      error: writeError.message,
    });
    console.error("Error en exchange_rate:", writeError.message);
    process.exit(1);
  }

  // Espejo activo: finde → tasa del próximo hábil si existe; si no, <= hoy VE.
  const weekday = new Date(`${syncDate}T12:00:00Z`).getUTCDay();
  const isWeekend = weekday === 0 || weekday === 6;
  let nextBiz = syncDate;
  {
    let cursor = syncDate;
    for (let i = 0; i < 10; i++) {
      const [y, m, d] = cursor.split("-").map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d + 1));
      cursor = dt.toISOString().slice(0, 10);
      const wd = dt.getUTCDay();
      if (wd !== 0 && wd !== 6) {
        nextBiz = cursor;
        break;
      }
    }
  }

  let active = null;
  if (isWeekend) {
    const { data: weekendAhead } = await admin
      .from("exchange_rate")
      .select("rate, effective_date")
      .is("store_id", null)
      .eq("effective_date", nextBiz)
      .maybeSingle();
    if (weekendAhead) active = weekendAhead;
  }
  if (!active) {
    const { data } = await admin
      .from("exchange_rate")
      .select("rate, effective_date")
      .is("store_id", null)
      .lte("effective_date", syncDate)
      .order("effective_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    active = data;
  }

  const activeRate = active ? Number(active.rate) : rate;
  const { error: tasaError } = await admin.from("tasas_cambio").upsert(
    {
      moneda: "USD",
      tasa: activeRate,
      ultima_actualizacion: updatedAt,
    },
    { onConflict: "moneda" },
  );

  if (tasaError) {
    await logSyncAttempt(admin, {
      syncDate,
      success: false,
      error: tasaError.message,
    });
    console.error("Error en tasas_cambio:", tasaError.message);
    process.exit(1);
  }

  await logSyncAttempt(admin, { syncDate, success: true, rate: activeRate });
  await resolveBcvAlerts(admin, syncDate);

  console.log(
    `Tasa BCV actualizada: ${activeRate} VES/USD (effective=${active?.effective_date ?? effectiveDate}, source=${fetched.source}, apiDate=${sourceDate ?? "n/a"}, ${updatedAt})`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
