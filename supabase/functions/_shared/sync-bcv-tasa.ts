import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { fetchBcvUsdRate } from "./bcv-client.ts";
import {
  getVenezuelaSyncDate,
  resolveBcvEffectiveDate,
} from "./sync-date.ts";

export interface SyncBcvTasaResult {
  success: boolean;
  rate?: number;
  effectiveDate?: string;
  activatedNow?: boolean;
  updatedAt?: string;
  error?: string;
}

function roundRate(rate: number): number {
  return Math.round((rate + Number.EPSILON) * 100) / 100;
}

async function upsertExchangeRateForDate(
  admin: SupabaseClient,
  input: { rate: number; effectiveDate: string; notes: string },
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

async function mirrorActiveRateToTasasCambio(
  admin: SupabaseClient,
): Promise<{ error?: string }> {
  const today = getVenezuelaSyncDate();
  const { data, error } = await admin
    .from("exchange_rate")
    .select("rate, effective_date")
    .is("store_id", null)
    .lte("effective_date", today)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return {};

  const rate = roundRate(Number(data.rate));
  const { error: upsertError } = await admin.from("tasas_cambio").upsert(
    {
      moneda: "USD",
      tasa: rate,
      ultima_actualizacion: new Date().toISOString(),
    },
    { onConflict: "moneda" },
  );
  return upsertError ? { error: upsertError.message } : {};
}

export async function syncBcvTasaToDatabase(
  admin: SupabaseClient,
  options?: { slot?: string },
): Promise<SyncBcvTasaResult> {
  try {
    const rate = roundRate(await fetchBcvUsdRate());
    if (!Number.isFinite(rate) || rate <= 0) {
      return {
        success: false,
        error: "La API BCV devolvió una tasa nula o inválida.",
      };
    }

    const today = getVenezuelaSyncDate();
    const effectiveDate = resolveBcvEffectiveDate({ slot: options?.slot });
    const activatedNow = effectiveDate <= today;
    const updatedAt = new Date().toISOString();
    const notes = activatedNow
      ? "Actualización automática BCV (vigente hoy)"
      : `Publicación BCV programada para ${effectiveDate} (America/Caracas)`;

    const write = await upsertExchangeRateForDate(admin, {
      rate,
      effectiveDate,
      notes,
    });
    if (write.error) return { success: false, error: write.error };

    const mirror = await mirrorActiveRateToTasasCambio(admin);
    if (mirror.error) return { success: false, error: mirror.error };

    return {
      success: true,
      rate,
      effectiveDate,
      activatedNow,
      updatedAt,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error
        ? error.message
        : "Error al sincronizar tasa BCV.",
    };
  }
}
