import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { fetchBcvUsdRate } from "./bcv-client.ts";

export interface SyncBcvTasaResult {
  success: boolean;
  rate?: number;
  updatedAt?: string;
  error?: string;
}

function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function syncBcvTasaToDatabase(
  admin: SupabaseClient,
): Promise<SyncBcvTasaResult> {
  try {
    const rate = await fetchBcvUsdRate();
    if (!Number.isFinite(rate) || rate <= 0) {
      return {
        success: false,
        error: "La API BCV devolvió una tasa nula o inválida.",
      };
    }

    const updatedAt = new Date().toISOString();
    const effectiveDate = todayUtcDate();

    const { error: tasaError } = await admin.from("tasas_cambio").upsert(
      {
        moneda: "USD",
        tasa: rate,
        ultima_actualizacion: updatedAt,
      },
      { onConflict: "moneda" },
    );

    if (tasaError) {
      return { success: false, error: tasaError.message };
    }

    const { data: existingRate } = await admin
      .from("exchange_rate")
      .select("id")
      .is("store_id", null)
      .eq("effective_date", effectiveDate)
      .maybeSingle();

    if (existingRate?.id) {
      const { error: updateError } = await admin
        .from("exchange_rate")
        .update({
          rate,
          source: "bcv",
          notes: "Actualización automática diaria (API BCV)",
        })
        .eq("id", existingRate.id);

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    } else {
      const { error: insertError } = await admin.from("exchange_rate").insert({
        rate,
        source: "bcv",
        effective_date: effectiveDate,
        store_id: null,
        notes: "Actualización automática diaria (API BCV)",
      });

      if (insertError) {
        return { success: false, error: insertError.message };
      }
    }

    return { success: true, rate, updatedAt };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error
        ? error.message
        : "Error al sincronizar tasa BCV.",
    };
  }
}
