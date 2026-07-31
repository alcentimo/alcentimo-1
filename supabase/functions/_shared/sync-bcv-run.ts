import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getVenezuelaSyncDate } from "./sync-date.ts";
import { syncBcvTasaToDatabase } from "./sync-bcv-tasa.ts";

export type BcvSyncSlot =
  | "midnight"
  | "morning"
  | "midday"
  | "retry"
  | "afternoon"
  | "evening"
  | "late_evening"
  | "manual"
  | "autoheal";

export type BcvSyncRunAction =
  | "success"
  | "awaiting_retry"
  | "alert_created";

export interface BcvSyncRunResult {
  success: boolean;
  action: BcvSyncRunAction;
  slot: BcvSyncSlot;
  syncDate: string;
  rate?: number;
  updatedAt?: string;
  error?: string;
}

const BCV_ALERT_TYPE = "bcv_sync_failure";

async function logSyncAttempt(
  admin: SupabaseClient,
  input: {
    syncDate: string;
    slot: BcvSyncSlot;
    success: boolean;
    rate?: number;
    error?: string;
  },
): Promise<void> {
  const { error } = await admin.from("tasas_cambio_sync_logs").insert({
    sync_date: input.syncDate,
    slot: input.slot,
    status: input.success ? "success" : "failure",
    rate: input.success ? input.rate : null,
    error_message: input.success ? null : (input.error ?? "Error desconocido"),
  });

  if (error) {
    console.error("[bcv-sync] No se pudo registrar el intento:", error.message);
  }
}

async function resolveBcvAlerts(
  admin: SupabaseClient,
  syncDate: string,
): Promise<void> {
  const resolvedAt = new Date().toISOString();
  const { error } = await admin
    .from("platform_alerts")
    .update({ resolved_at: resolvedAt })
    .eq("alert_type", BCV_ALERT_TYPE)
    .eq("sync_date", syncDate)
    .is("resolved_at", null);

  if (error) {
    console.error("[bcv-sync] No se pudieron resolver alertas:", error.message);
  }
}

async function createBcvFailureAlert(
  admin: SupabaseClient,
  syncDate: string,
  errorMessage?: string,
): Promise<void> {
  const { data: existing } = await admin
    .from("platform_alerts")
    .select("id")
    .eq("alert_type", BCV_ALERT_TYPE)
    .eq("sync_date", syncDate)
    .is("resolved_at", null)
    .maybeSingle();

  if (existing?.id) return;

  const detail = errorMessage ??
    "La API BCV no devolvió una tasa válida tras los reintentos del día.";

  const { error } = await admin.from("platform_alerts").insert({
    alert_type: BCV_ALERT_TYPE,
    message:
      "No se pudo actualizar la tasa BCV hoy. Los precios en bolívares pueden estar desactualizados. El sistema seguirá reintentando automáticamente.",
    detail,
    sync_date: syncDate,
  });

  if (error) {
    console.error("[bcv-sync] No se pudo crear alerta de plataforma:", error.message);
  }
}

function isFinalRetrySlot(slot: BcvSyncSlot): boolean {
  return slot === "late_evening";
}

/** Todos los slots consultan la API (sin omitir por éxito temprano). */
export async function runBcvSyncAttempt(
  admin: SupabaseClient,
  slot: BcvSyncSlot,
): Promise<BcvSyncRunResult> {
  const syncDate = getVenezuelaSyncDate();

  const result = await syncBcvTasaToDatabase(admin, { slot });

  await logSyncAttempt(admin, {
    syncDate,
    slot,
    success: result.success,
    rate: result.rate,
    error: result.error,
  });

  if (result.success) {
    await resolveBcvAlerts(admin, syncDate);
    return {
      success: true,
      action: "success",
      slot,
      syncDate,
      rate: result.rate,
      updatedAt: result.updatedAt,
    };
  }

  if (!isFinalRetrySlot(slot) && slot !== "manual" && slot !== "autoheal") {
    return {
      success: false,
      action: "awaiting_retry",
      slot,
      syncDate,
      error: result.error,
    };
  }

  await createBcvFailureAlert(admin, syncDate, result.error);

  return {
    success: false,
    action: "alert_created",
    slot,
    syncDate,
    error: result.error,
  };
}
