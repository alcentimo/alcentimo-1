import { createAdminClient } from "@/lib/supabase/admin";
import { logBcvSync } from "@/lib/exchange-rate/bcv-sync-log";
import { isBcvRateBehindCalendarDay } from "@/lib/exchange-rate/rate-freshness";
import { runManualBcvSync } from "@/lib/exchange-rate/sync-bcv-run";
import { getVenezuelaSyncDate } from "@/lib/exchange-rate/sync-date";
import { roundExchangeRate } from "@/lib/format";
import type { ExchangeRate } from "@/lib/database.types";

const AUTOHEAL_COOLDOWN_MS = 10 * 60 * 1000;
/** Tope para no congelar el layout del dashboard si la API BCV no responde. */
const AUTOHEAL_BUDGET_MS = 3_000;

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
 * Si la tasa no es del día operativo VE, intenta sincronizar automáticamente
 * sin intervención manual del comerciante.
 */
export async function ensureBcvRateFreshForToday(
  currentRate: ExchangeRate | null,
): Promise<ExchangeRate | null> {
  const updatedAt = currentRate?.created_at ?? null;
  if (!isBcvRateBehindCalendarDay(updatedAt)) {
    return currentRate;
  }

  logBcvSync(
    "autoheal_triggered",
    {
      updatedAt,
      rate: currentRate?.rate ?? null,
    },
    "warn",
  );

  try {
    const admin = createAdminClient();
    const syncDate = getVenezuelaSyncDate();

    if (await wasAutohealAttemptedRecently(admin, syncDate)) {
      logBcvSync("autoheal_cooldown", { syncDate });
      return currentRate;
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
        { syncDate, budgetMs: AUTOHEAL_BUDGET_MS },
        "warn",
      );
      return currentRate;
    }

    if (!result.success || result.rate == null || !result.updatedAt) {
      logBcvSync(
        "autoheal_failed",
        { error: result.error ?? "unknown" },
        "error",
      );
      return currentRate;
    }

    // No reusar getCurrentExchangeRate (cache de request): devolver el upsert fresco.
    return {
      id: currentRate?.id ?? `tasas_cambio:USD`,
      rate: roundExchangeRate(result.rate),
      source: "bcv",
      effective_date: result.updatedAt.slice(0, 10),
      notes: "Tasa BCV sincronizada automáticamente",
      store_id: null,
      created_at: result.updatedAt,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error en autoheal BCV.";
    logBcvSync("autoheal_exception", { error: message }, "error");
    return currentRate;
  }
}
