import type { SupabaseClient } from "@supabase/supabase-js";
import { logBcvSync } from "@/lib/exchange-rate/bcv-sync-log";
import { fetchBcvUsdRate } from "@/lib/exchange-rate/bcv-client";
import { getActiveGlobalExchangeRate } from "@/lib/exchange-rate/get-tasa-cambio";
import {
  getVenezuelaSyncDate,
  isBcvEffectiveDateActiveNow,
  resolveBcvEffectiveDate,
} from "@/lib/exchange-rate/sync-date";
import { roundExchangeRate } from "@/lib/format";

export interface SyncBcvTasaResult {
  success: boolean;
  rate?: number;
  /** Fecha de vigencia YYYY-MM-DD (America/Caracas) con la que se guardó. */
  effectiveDate?: string;
  /** true si la tasa ya está activa ahora (hoy o finde→lunes). */
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
    source?: "bcv" | "manual";
  },
): Promise<{ error?: string }> {
  const source = input.source ?? "bcv";
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
        source,
        notes: input.notes,
      })
      .eq("id", existingRate.id);
    return error ? { error: error.message } : {};
  }

  const { error } = await admin.from("exchange_rate").insert({
    rate: input.rate,
    source,
    effective_date: input.effectiveDate,
    store_id: null,
    notes: input.notes,
  });
  return error ? { error: error.message } : {};
}

/**
 * Publica una tasa manual en exchange_rate (hoy VE) y el espejo tasas_cambio
 * para que vistas SQL y la app usen el mismo valor de contingencia.
 */
export async function applyManualBcvRateToDatabase(
  admin: SupabaseClient,
  rateInput: number,
): Promise<SyncBcvTasaResult> {
  const rate = roundExchangeRate(rateInput);
  if (!Number.isFinite(rate) || rate <= 0) {
    return { success: false, error: "La tasa manual debe ser mayor que 0." };
  }

  const effectiveDate = getVenezuelaSyncDate();
  const updatedAt = new Date().toISOString();
  const write = await upsertExchangeRateForDate(admin, {
    rate,
    effectiveDate,
    source: "manual",
    notes: "Tasa BCV manual (contingencia admin)",
  });
  if (write.error) {
    return { success: false, error: write.error };
  }

  const { error: mirrorError } = await admin.from("tasas_cambio").upsert(
    {
      moneda: "USD",
      tasa: rate,
      ultima_actualizacion: updatedAt,
    },
    { onConflict: "moneda" },
  );
  if (mirrorError) {
    return { success: false, error: mirrorError.message };
  }

  return {
    success: true,
    rate,
    effectiveDate,
    activatedNow: true,
    updatedAt,
  };
}

/**
 * Copia a tasas_cambio la tasa legalmente vigente
 * (incluye sábado/domingo → tasa del lunes si ya está publicada).
 */
export async function mirrorActiveRateToTasasCambio(
  admin: SupabaseClient,
): Promise<{ rate?: number; effectiveDate?: string; error?: string }> {
  try {
    const active = await getActiveGlobalExchangeRate(admin);
    if (!active) return {};

    const rate = roundExchangeRate(Number(active.rate));
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
      effectiveDate: String(active.effective_date),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Error al espejar tasa.",
    };
  }
}

/**
 * Descarga la tasa BCV y la guarda con la fecha de vigencia oficial de la API.
 * Un día comercial = una fila en exchange_rate (unique por effective_date).
 * tasas_cambio refleja la tasa activa ahora (incl. finde→lunes).
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
    const activatedNow = isBcvEffectiveDateActiveNow(effectiveDate);
    const updatedAt = new Date().toISOString();

    const notes = activatedNow
      ? `Actualización BCV (vigente ${effectiveDate})`
      : `Publicación BCV con vigencia ${effectiveDate} (America/Caracas)`;

    logBcvSync("db_upsert_start", {
      effectiveDate,
      today,
      activatedNow,
      rate,
      slot: options?.slot ?? null,
      sourceEffectiveDate: fetched.sourceEffectiveDate,
    });

    // Persistencia estricta por día de vigencia oficial (sin mezclar con “hoy”).
    const write = await upsertExchangeRateForDate(admin, {
      rate,
      effectiveDate,
      notes,
    });
    if (write.error) {
      logBcvSync("db_legacy_upsert_failed", { error: write.error }, "error");
      return { success: false, error: write.error };
    }

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
      activeEffectiveDate: mirror.effectiveDate ?? null,
      updatedAt,
    });

    return {
      success: true,
      // Devolver la tasa guardada (fecha oficial), no solo el espejo activo.
      rate,
      effectiveDate,
      activatedNow,
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
