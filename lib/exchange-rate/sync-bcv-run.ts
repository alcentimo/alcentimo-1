import type { SupabaseClient } from "@supabase/supabase-js";
import { getVenezuelaSyncDate } from "@/lib/exchange-rate/sync-date";
import { syncBcvTasaToDatabase } from "@/lib/exchange-rate/sync-bcv-tasa";
import { logBcvSync } from "@/lib/exchange-rate/bcv-sync-log";

export type BcvSyncSlot =
  | "midnight"
  | "morning"
  | "midday"
  | "retry"
  | "afternoon"
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

const SLOT_SCHEDULE_LABEL: Partial<Record<BcvSyncSlot, string>> = {
  midnight: "01:00 America/Caracas",
  morning: "06:00 America/Caracas",
  midday: "09:00 America/Caracas",
  retry: "12:00 America/Caracas",
  afternoon: "14:00 America/Caracas",
};

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
    logBcvSync("sync_log_insert_failed", { error: error.message }, "error");
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

  const detail =
    errorMessage ??
    "La API BCV no devolvió una tasa válida tras los reintentos del día (America/Caracas).";

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
  return slot === "afternoon" || slot === "retry";
}

/** Ejecuta un intento de sincronización. Todos los slots consultan la API (sin omitir). */
export async function runBcvSyncAttempt(
  admin: SupabaseClient,
  slot: BcvSyncSlot,
): Promise<BcvSyncRunResult> {
  const syncDate = getVenezuelaSyncDate();

  logBcvSync("attempt_start", { slot, syncDate });

  const result = await syncBcvTasaToDatabase(admin);

  await logSyncAttempt(admin, {
    syncDate,
    slot,
    success: result.success,
    rate: result.rate,
    error: result.error,
  });

  if (result.success) {
    await resolveBcvAlerts(admin, syncDate);

    const schedule = SLOT_SCHEDULE_LABEL[slot];
    if (schedule) {
      logBcvSync("scheduled_sync_confirmed", {
        slot,
        syncDate,
        rate: result.rate,
        updatedAt: result.updatedAt,
        schedule,
        message: `Sincronización BCV de las ${schedule} completada con éxito.`,
      });
    }

    logBcvSync("attempt_success", {
      slot,
      syncDate,
      rate: result.rate,
      updatedAt: result.updatedAt,
    });
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
    logBcvSync(
      "attempt_failed_awaiting_retry",
      {
        slot,
        syncDate,
        error: result.error,
        message:
          "Falló este intento; las siguientes ventanas del día reintentarán automáticamente.",
      },
      "warn",
    );
    return {
      success: false,
      action: "awaiting_retry",
      slot,
      syncDate,
      error: result.error,
    };
  }

  await createBcvFailureAlert(admin, syncDate, result.error);

  logBcvSync(
    "attempt_failed_alert_created",
    { slot, syncDate, error: result.error },
    "error",
  );

  return {
    success: false,
    action: "alert_created",
    slot,
    syncDate,
    error: result.error,
  };
}

/** Sincronización manual / auto-heal (siempre intenta fetch + upsert). */
export async function runManualBcvSync(
  admin: SupabaseClient,
  slot: Extract<BcvSyncSlot, "manual" | "autoheal"> = "manual",
): Promise<BcvSyncRunResult> {
  const syncDate = getVenezuelaSyncDate();

  logBcvSync(slot === "autoheal" ? "autoheal_sync_start" : "manual_sync_start", {
    syncDate,
  });

  const result = await syncBcvTasaToDatabase(admin);

  await logSyncAttempt(admin, {
    syncDate,
    slot,
    success: result.success,
    rate: result.rate,
    error: result.error,
  });

  if (result.success) {
    await resolveBcvAlerts(admin, syncDate);
    logBcvSync(slot === "autoheal" ? "autoheal_sync_success" : "manual_sync_success", {
      syncDate,
      rate: result.rate,
      updatedAt: result.updatedAt,
    });
    return {
      success: true,
      action: "success",
      slot,
      syncDate,
      rate: result.rate,
      updatedAt: result.updatedAt,
    };
  }

  logBcvSync(
    slot === "autoheal" ? "autoheal_sync_failed" : "manual_sync_failed",
    { syncDate, error: result.error },
    "error",
  );

  return {
    success: false,
    action: "alert_created",
    slot,
    syncDate,
    error: result.error,
  };
}
