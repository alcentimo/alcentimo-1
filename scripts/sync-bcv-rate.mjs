#!/usr/bin/env node
/**
 * Sincroniza la tasa BCV en tasas_cambio.
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
  "https://pydolarvenezuela-api.vercel.app/api/v1/dollar?page=bcv",
  "https://pydolarvenezuela-api.vercel.app/api/v2/tipo-cambio",
  "https://bcv-exchange-rates.vercel.app/get_bcv_exchange_rates",
];

function parseNumericRate(value) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const normalized = value.trim().replace(/\./g, "").replace(",", ".");
    const parsed = Number.parseFloat(normalized);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function extractRate(payload) {
  if (!payload || typeof payload !== "object") return null;
  const direct = [payload.price, payload.tasa, payload.rate, payload.valor, payload.value];
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

async function fetchBcvUsdRate() {
  const errors = [];
  for (const endpoint of BCV_API_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const rate = extractRate(payload);
      if (rate) return rate;
      errors.push(`${endpoint}: sin tasa válida`);
    } catch (error) {
      errors.push(`${endpoint}: ${error instanceof Error ? error.message : "error"}`);
    }
  }
  throw new Error(errors.join(" | "));
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
    slot: "retry",
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

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const rate = await fetchBcvUsdRate();
  if (!Number.isFinite(rate) || rate <= 0) {
    console.error("La API BCV devolvió una tasa nula o inválida.");
    process.exit(1);
  }

  const updatedAt = new Date().toISOString();
  const syncDate = getVenezuelaSyncDate();
  const effectiveDate = updatedAt.slice(0, 10);
  const admin = createClient(url, serviceRoleKey);

  const { error: tasaError } = await admin.from("tasas_cambio").upsert(
    {
      moneda: "USD",
      tasa: rate,
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

  const { data: existingRate } = await admin
    .from("exchange_rate")
    .select("id")
    .is("store_id", null)
    .eq("effective_date", effectiveDate)
    .maybeSingle();

  if (existingRate?.id) {
    await admin
      .from("exchange_rate")
      .update({
        rate,
        source: "bcv",
        notes: "Actualización automática diaria (API BCV)",
      })
      .eq("id", existingRate.id);
  } else {
    await admin.from("exchange_rate").insert({
      rate,
      source: "bcv",
      effective_date: effectiveDate,
      store_id: null,
      notes: "Actualización automática diaria (API BCV)",
    });
  }

  await logSyncAttempt(admin, { syncDate, success: true, rate });
  await resolveBcvAlerts(admin, syncDate);

  console.log(`Tasa BCV actualizada: ${rate} VES/USD (${updatedAt})`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
