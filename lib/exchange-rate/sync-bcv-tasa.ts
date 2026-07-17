import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchBcvUsdRate } from "@/lib/exchange-rate/bcv-client";
import { logBcvSync } from "@/lib/exchange-rate/bcv-sync-log";

export interface SyncBcvTasaResult {
  success: boolean;
  rate?: number;
  updatedAt?: string;
  error?: string;
}

function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Persiste la tasa BCV en tasas_cambio y sincroniza exchange_rate legacy. */
export async function syncBcvTasaToDatabase(
  admin: SupabaseClient,
): Promise<SyncBcvTasaResult> {
  try {
    logBcvSync("fetch_start");
    const rate = await fetchBcvUsdRate();
    logBcvSync("fetch_success", { rate });

    if (!Number.isFinite(rate) || rate <= 0) {
      logBcvSync("fetch_invalid_rate", { rate }, "error");
      return { success: false, error: "La API BCV devolvió una tasa nula o inválida." };
    }

    const updatedAt = new Date().toISOString();
    const effectiveDate = todayUtcDate();

    logBcvSync("db_upsert_start", { effectiveDate, rate });
    const { error: tasaError } = await admin.from("tasas_cambio").upsert(
      {
        moneda: "USD",
        tasa: rate,
        ultima_actualizacion: updatedAt,
      },
      { onConflict: "moneda" },
    );

    if (tasaError) {
      logBcvSync("db_upsert_failed", { error: tasaError.message }, "error");
      return { success: false, error: tasaError.message };
    }

    logBcvSync("db_upsert_success", { updatedAt });

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
        logBcvSync("db_legacy_update_failed", { error: updateError.message }, "error");
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
        logBcvSync("db_legacy_insert_failed", { error: insertError.message }, "error");
        return { success: false, error: insertError.message };
      }
    }

    logBcvSync("sync_complete", { rate, updatedAt });
    return { success: true, rate, updatedAt };
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
