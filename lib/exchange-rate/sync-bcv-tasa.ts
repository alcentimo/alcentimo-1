import type { SupabaseClient } from "@supabase/supabase-js";
import { logBcvSync } from "@/lib/exchange-rate/bcv-sync-log";
import { fetchBcvUsdRate } from "@/lib/exchange-rate/bcv-client";
import {
  getVenezuelaSyncDate,
  resolveBcvEffectiveDate,
} from "@/lib/exchange-rate/sync-date";
import { roundExchangeRate } from "@/lib/format";

export interface SyncBcvTasaResult {
  success: boolean;
  rate?: number;
  /** Fecha de vigencia YYYY-MM-DD (America/Caracas) con la que se guardó. */
  effectiveDate?: string;
  /** true si la tasa ya está activa hoy; false si quedó programada para mañana. */
  activatedNow?: boolean;
  updatedAt?: string;
  error?: string;
}

async function upsertExchangeRateForDate(
  admin: SupabaseClient,
  input: {
    rate: number;
    effectiveDate: string;
    notes: string;
  },
): Promise<{ error?: string }> {
  const { data: existingRate } = await admin
    .from("exchange_rate")
    .select("id")
    .is("store_id", null)
    .eq("effective_date", input.effectiveDate)
    .maybeSingle();

  if (existingRate?.id) {
    const { error } = await admin
      .from("exchange_rate")
      .update({
        rate: input.rate,
        source: "bcv",
        notes: input.notes,
      })
      .eq("id", existingRate.id);
    return error ? { error: error.message } : {};
  }

  const { error } = await admin.from("exchange_rate").insert({
    rate: input.rate,
    source: "bcv",
    effective_date: input.effectiveDate,
    store_id: null,
    notes: input.notes,
  });
  return error ? { error: error.message } : {};
}

/**
 * Copia a tasas_cambio la tasa vigente (effective_date <= hoy VE).
 * Incluye carry-forward: si aún no hay fila de hoy, espeja la última válida.
 */
export async function mirrorActiveRateToTasasCambio(
  admin: SupabaseClient,
): Promise<{ rate?: number; effectiveDate?: string; error?: string }> {
  const today = getVenezuelaSyncDate();
  const { data, error } = await admin
    .from("exchange_rate")
    .select("rate, effective_date, created_at")
    .is("store_id", null)
    .lte("effective_date", today)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return {};

  const rate = roundExchangeRate(Number(data.rate));
  const updatedAt = new Date().toISOString();
  const { error: upsertError } = await admin.from("tasas_cambio").upsert(
    {
      moneda: "USD",
      tasa: rate,
      ultima_actualizacion: updatedAt,
    },
    { onConflict: "moneda" },
  );

  if (upsertError) return { error: upsertError.message };

  return {
    rate,
    effectiveDate: String(data.effective_date),
  };
}

/**
 * Descarga la tasa BCV y la guarda con fecha de vigencia.
 * Prefiere la effective_date de la API; si no hay, usa heurística por slot.
 * tasas_cambio solo refleja la tasa activa hoy.
 */
export async function syncBcvTasaToDatabase(
  admin: SupabaseClient,
  options?: { slot?: string },
): Promise<SyncBcvTasaResult> {
  try {
    logBcvSync("fetch_start", { slot: options?.slot ?? null });
    const fetched = await fetchBcvUsdRate();
    const rate = roundExchangeRate(fetched.rate);
    logBcvSync("fetch_success", {
      rate,
      rawRate: fetched.rate,
      sourceEffectiveDate: fetched.sourceEffectiveDate,
      source: fetched.source,
    });

    if (!Number.isFinite(rate) || rate <= 0) {
      logBcvSync("fetch_invalid_rate", { rate }, "error");
      return {
        success: false,
        error: "La API BCV devolvió una tasa nula o inválida.",
      };
    }

    const today = getVenezuelaSyncDate();
    const effectiveDate = resolveBcvEffectiveDate({
      slot: options?.slot,
      sourceEffectiveDate: fetched.sourceEffectiveDate,
    });
    const activatedNow = effectiveDate <= today;
    const updatedAt = new Date().toISOString();

    const notes = activatedNow
      ? "Actualización automática BCV (vigente hoy)"
      : `Publicación BCV programada para ${effectiveDate} (America/Caracas)`;

    logBcvSync("db_upsert_start", {
      effectiveDate,
      today,
      activatedNow,
      rate,
      slot: options?.slot ?? null,
      sourceEffectiveDate: fetched.sourceEffectiveDate,
    });

    const write = await upsertExchangeRateForDate(admin, {
      rate,
      effectiveDate,
      notes,
    });
    if (write.error) {
      logBcvSync("db_legacy_upsert_failed", { error: write.error }, "error");
      return { success: false, error: write.error };
    }

    // Revisión intradía: si el slot programó mañana pero la API no confirma
    // mañana, actualiza también la fila de hoy (BCV revisó el valor del día).
    if (
      !activatedNow &&
      fetched.sourceEffectiveDate !== effectiveDate
    ) {
      const todayWrite = await upsertExchangeRateForDate(admin, {
        rate,
        effectiveDate: today,
        notes: "Actualización BCV intradía (alineada a valor publicado)",
      });
      if (todayWrite.error) {
        logBcvSync(
          "db_today_align_failed",
          { error: todayWrite.error },
          "error",
        );
      } else {
        logBcvSync("db_today_align_ok", { rate, today });
      }
    }

    // tasas_cambio = solo tasa activa (nunca adelantar la del día siguiente).
    const mirror = await mirrorActiveRateToTasasCambio(admin);
    if (mirror.error) {
      logBcvSync("db_upsert_failed", { error: mirror.error }, "error");
      return { success: false, error: mirror.error };
    }

    logBcvSync("sync_complete", {
      rate,
      effectiveDate,
      activatedNow,
      activeRate: mirror.rate ?? null,
      updatedAt,
    });

    return {
      success: true,
      rate: mirror.rate ?? rate,
      effectiveDate: mirror.effectiveDate ?? effectiveDate,
      activatedNow: (mirror.effectiveDate ?? effectiveDate) <= today,
      updatedAt,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al sincronizar tasa BCV.";
    logBcvSync("sync_exception", { error: message }, "error");
    return {
      success: false,
      error: message,
    };
  }
}
