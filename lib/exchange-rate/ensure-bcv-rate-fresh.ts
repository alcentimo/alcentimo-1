import { createAdminClient } from "@/lib/supabase/admin";
import { logBcvSync } from "@/lib/exchange-rate/bcv-sync-log";
import { getActiveGlobalExchangeRate } from "@/lib/exchange-rate/get-tasa-cambio";
import {
  isBcvRateBehindCalendarDay,
  isBcvRateStale,
} from "@/lib/exchange-rate/rate-freshness";
import { runManualBcvSync } from "@/lib/exchange-rate/sync-bcv-run";
import { getVenezuelaSyncDate } from "@/lib/exchange-rate/sync-date";
import type { ExchangeRate } from "@/lib/database.types";

const AUTOHEAL_COOLDOWN_MS = 10 * 60 * 1000;
/** Tope para no congelar el layout; cubre 2 endpoints × reintentos cortos. */
const AUTOHEAL_BUDGET_MS = 12_000;

async function wasAutohealAttemptedRecently(
  admin: ReturnType<typeof createAdminClient>,
  syncDate: string,
): Promise<boolean> {
  const since = new Date(Date.now() - AUTOHEAL_COOLDOWN_MS).toISOString();
  const { data } = await admin
    .from("tasas_cambio_sync_logs")
    .select("id, created_at")
    .eq("sync_date", syncDate)
    .eq("slot", "autoheal")
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}

/**
 * Si la tasa activa es de un día anterior (BCV atrasado / cron fallido),
 * o el espejo tasas_cambio lleva muchas horas sin refrescarse en el mismo día,
 * intenta sincronizar.
 *
 * Nunca deja la app sin precio: ante fallo, cooldown o timeout se conserva
 * la última tasa válida (carry-forward). Tras sync exitosa, relee por
 * effective_date (no asume que el valor descargado ya esté activo si quedó
 * programado para mañana).
 */
export async function ensureBcvRateFreshForToday(
  currentRate: ExchangeRate | null,
): Promise<ExchangeRate | null> {
  const effectiveDate = currentRate?.effective_date ?? null;
  const behindDay = isBcvRateBehindCalendarDay(effectiveDate);

  let mirrorStale = false;
  try {
    const adminProbe = createAdminClient();
    const { data: mirror } = await adminProbe
      .from("tasas_cambio")
      .select("ultima_actualizacion, tasa")
      .eq("moneda", "USD")
      .maybeSingle();
    // Mismo día operativo pero espejo viejo (>3 h): el BCV pudo publicar más tarde.
    mirrorStale = Boolean(
      !behindDay &&
        mirror?.ultima_actualizacion &&
        isBcvRateStale(String(mirror.ultima_actualizacion), 3),
    );
  } catch {
    mirrorStale = false;
  }

  if (!behindDay && !mirrorStale) {
    return currentRate;
  }

  // Carry-forward explícito: seguir mostrando la última tasa mientras se intenta actualizar.
  const carryForward = currentRate;

  logBcvSync(
    "autoheal_triggered",
    {
      effectiveDate,
      updatedAt: carryForward?.created_at ?? null,
      rate: carryForward?.rate ?? null,
      carryForward: true,
      reason: behindDay ? "behind_calendar_day" : "mirror_stale_same_day",
    },
    "warn",
  );

  try {
    const admin = createAdminClient();
    const syncDate = getVenezuelaSyncDate();

    if (await wasAutohealAttemptedRecently(admin, syncDate)) {
      logBcvSync("autoheal_cooldown", { syncDate, carryForward: true });
      return carryForward;
    }

    const result = await Promise.race([
      runManualBcvSync(admin, "autoheal"),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), AUTOHEAL_BUDGET_MS);
      }),
    ]);

    if (!result) {
      logBcvSync(
        "autoheal_budget_exceeded",
        { syncDate, budgetMs: AUTOHEAL_BUDGET_MS, carryForward: true },
        "warn",
      );
      return carryForward;
    }

    if (!result.success) {
      logBcvSync(
        "autoheal_failed",
        { error: result.error ?? "unknown", carryForward: true },
        "error",
      );
      return carryForward;
    }

    const active = await getActiveGlobalExchangeRate(admin);
    if (active && active.rate > 0) {
      logBcvSync("autoheal_sync_success", {
        syncDate,
        rate: active.rate,
        effectiveDate: active.effective_date,
      });
      return active;
    }

    return carryForward;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error en autoheal BCV.";
    logBcvSync(
      "autoheal_exception",
      { error: message, carryForward: true },
      "error",
    );
    return carryForward;
  }
}
