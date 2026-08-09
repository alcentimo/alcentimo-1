import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PLATFORM_SETTINGS_ID,
  type BcvRateMode,
} from "@/lib/platform/platform-settings";
import { getVenezuelaSyncDate } from "@/lib/exchange-rate/sync-date";
import { roundExchangeRate } from "@/lib/format";
import type { ExchangeRate } from "@/lib/database.types";

export type { BcvRateMode };

export interface BcvRateModeConfig {
  mode: BcvRateMode;
  manualRate: number | null;
}

export const DEFAULT_BCV_RATE_MODE_CONFIG: BcvRateModeConfig = {
  mode: "automatic",
  manualRate: null,
};

function parseMode(value: unknown): BcvRateMode {
  return value === "manual" ? "manual" : "automatic";
}

function parseManualRate(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return roundExchangeRate(n);
}

/** Lee modo BCV desde platform_settings (anon/authenticated OK por RLS). */
export async function readBcvRateModeConfig(
  client: SupabaseClient,
): Promise<BcvRateModeConfig> {
  try {
    const { data, error } = await client
      .from("platform_settings")
      .select("bcv_rate_mode, manual_bcv_rate")
      .eq("id", PLATFORM_SETTINGS_ID)
      .maybeSingle();

    if (error || !data) {
      return { ...DEFAULT_BCV_RATE_MODE_CONFIG };
    }

    return {
      mode: parseMode(data.bcv_rate_mode),
      manualRate: parseManualRate(data.manual_bcv_rate),
    };
  } catch {
    return { ...DEFAULT_BCV_RATE_MODE_CONFIG };
  }
}

export function isManualBcvRateActive(config: BcvRateModeConfig): boolean {
  return (
    config.mode === "manual" &&
    config.manualRate != null &&
    config.manualRate > 0
  );
}

/** ExchangeRate sintético para conversión cuando el modo manual está activo. */
export function buildManualExchangeRate(
  manualRate: number,
  reference = new Date(),
): ExchangeRate {
  const rate = roundExchangeRate(manualRate);
  const now = reference.toISOString();
  return {
    id: "platform_settings:manual_bcv_rate",
    rate,
    source: "manual",
    effective_date: getVenezuelaSyncDate(reference),
    notes: "Tasa BCV manual (contingencia admin)",
    store_id: null,
    created_at: now,
  };
}
