import type { SupabaseClient } from "@supabase/supabase-js";
import { getVenezuelaSyncDate } from "@/lib/exchange-rate/sync-date";
import { syncBcvTasaToDatabase } from "@/lib/exchange-rate/sync-bcv-tasa";
import { logBcvSync } from "@/lib/exchange-rate/bcv-sync-log";

export type BcvSyncSlot = "midnight" | "morning" | "retry" | "manual";

export type BcvSyncRunAction =
  | "success"
  | "awaiting_retry"
  | "alert_created"
  | "skipped_already_synced";

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

const SLOT_SCHEDULE_LABEL: Record<Exclude<BcvSyncSlot, "manual">, string> = {
  midnight: "01:00 America/Caracas",
  morning: "06:00 America/Caracas",
  retry: "12:00 America/Caracas",
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

async function hasSuccessfulSyncToday(
  admin: SupabaseClient,
  syncDate: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from("tasas_cambio_sync_logs")
    .select("id")
    .eq("sync_date", syncDate)
    .eq("status", "success")
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data);
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
    "La API BCV no devolvió una tasa válida tras el reintento de las 12:00 (America/Caracas).";

  const { error } = await admin.from("platform_alerts").insert({
    alert_type: BCV_ALERT_TYPE,
    message:
      "No se pudo actualizar la tasa BCV hoy. Los precios en bolívares pueden estar desactualizados. Requiere intervención manual.",
    detail,
    sync_date: syncDate,
  });

  if (error) {
    console.error("[bcv-sync] No se pudo crear alerta de plataforma:", error.message);
  }
}

/** Ejecuta un intento de sincronización (01:00, 06:00 o reintento 12:00 VE). */
export async function runBcvSyncAttempt(
  admin: SupabaseClient,
  slot: BcvSyncSlot,
): Promise<BcvSyncRunResult> {
  const syncDate = getVenezuelaSyncDate();

  logBcvSync("attempt_start", { slot, syncDate });

  // Solo el reintento de mediodía se omite si ya hubo éxito hoy.
  // 01:00 y 06:00 siempre consultan la API para refrescar la tasa.
  if (slot === "retry" && (await hasSuccessfulSyncToday(admin, syncDate))) {
    logBcvSync("attempt_skipped", { slot, syncDate, reason: "already_synced_today" });
    return {
      success: true,
      action: "skipped_already_synced",
      slot,
      syncDate,
    };
  }

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

    if (slot === "midnight" || slot === "morning") {
      logBcvSync("scheduled_sync_confirmed", {
        slot,
        syncDate,
        rate: result.rate,
        updatedAt: result.updatedAt,
        schedule: SLOT_SCHEDULE_LABEL[slot],
        message: `Sincronización BCV de las ${SLOT_SCHEDULE_LABEL[slot]} completada con éxito.`,
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

  if (slot === "midnight" || slot === "morning") {
    logBcvSync(
      "attempt_failed_awaiting_retry",
      {
        slot,
        syncDate,
        error: result.error,
        message:
          slot === "midnight"
            ? "Falló la sync de las 01:00; el intento de las 06:00 refrescará la tasa."
            : "Falló la sync de las 06:00; el reintento de las 12:00 intentará de nuevo.",
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

  logBcvSync("attempt_failed_alert_created", { slot, syncDate, error: result.error }, "error");

  return {
    success: false,
    action: "alert_created",
    slot,
    syncDate,
    error: result.error,
  };
}

/** Sincronización manual desde el dashboard (siempre intenta fetch + upsert). */
export async function runManualBcvSync(
  admin: SupabaseClient,
): Promise<BcvSyncRunResult> {
  const syncDate = getVenezuelaSyncDate();

  logBcvSync("manual_sync_start", { syncDate });

  const result = await syncBcvTasaToDatabase(admin);

  await logSyncAttempt(admin, {
    syncDate,
    slot: "manual",
    success: result.success,
    rate: result.rate,
    error: result.error,
  });

  if (result.success) {
    await resolveBcvAlerts(admin, syncDate);
    logBcvSync("manual_sync_success", {
      syncDate,
      rate: result.rate,
      updatedAt: result.updatedAt,
    });
    return {
      success: true,
      action: "success",
      slot: "manual",
      syncDate,
      rate: result.rate,
      updatedAt: result.updatedAt,
    };
  }

  logBcvSync("manual_sync_failed", { syncDate, error: result.error }, "error");

  return {
    success: false,
    action: "alert_created",
    slot: "manual",
    syncDate,
    error: result.error,
  };
}
