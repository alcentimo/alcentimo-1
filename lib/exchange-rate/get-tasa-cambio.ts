import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildManualExchangeRate,
  isManualBcvRateActive,
  readBcvRateModeConfig,
} from "@/lib/exchange-rate/bcv-rate-mode";
import {
  getVenezuelaNextBusinessDate,
  getVenezuelaSyncDate,
  isVenezuelaWeekend,
} from "@/lib/exchange-rate/sync-date";
import { roundExchangeRate } from "@/lib/format";
import type { ExchangeRate } from "@/lib/database.types";

export interface TasaCambioRow {
  moneda: string;
  tasa: number;
  ultima_actualizacion: string;
}

function asExchangeRate(data: ExchangeRate): ExchangeRate {
  return {
    ...data,
    rate: roundExchangeRate(Number(data.rate) || 0),
  };
}

/**
 * Tasa BCV legalmente vigente para precios.
 *
 * 1) Última fila global con `effective_date <= hoy VE` (carry-forward).
 * 2) Fin de semana: si el viernes se publicó la tasa del próximo hábil (lunes),
 *    esa fila (`effective_date = lunes`) se usa en sábado/domingo aunque sea futura.
 * 3) Si no hay filas, el caller puede caer a `tasas_cambio`.
 */
export async function getActiveGlobalExchangeRate(
  client: SupabaseClient,
  reference = new Date(),
): Promise<ExchangeRate | null> {
  const today = getVenezuelaSyncDate(reference);

  const { data: asOfToday, error } = await client
    .from("exchange_rate")
    .select("*")
    .is("store_id", null)
    .lte("effective_date", today)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (isVenezuelaWeekend(reference)) {
    const nextBiz = getVenezuelaNextBusinessDate(reference);
    const { data: weekendAhead, error: weekendError } = await client
      .from("exchange_rate")
      .select("*")
      .is("store_id", null)
      .eq("effective_date", nextBiz)
      .maybeSingle();

    if (weekendError) throw new Error(weekendError.message);

    if (weekendAhead && Number(weekendAhead.rate) > 0) {
      // Preferir la tasa del próximo hábil publicada el viernes.
      return asExchangeRate(weekendAhead as ExchangeRate);
    }
  }

  if (!asOfToday) return null;
  return asExchangeRate(asOfToday as ExchangeRate);
}

/**
 * Última tasa usable para precios: modo manual de platform_settings,
 * vigencia legal en exchange_rate, o espejo en tasas_cambio.
 */
export async function getDisplayableUsdExchangeRate(
  client: SupabaseClient,
  reference = new Date(),
): Promise<ExchangeRate | null> {
  const modeConfig = await readBcvRateModeConfig(client);
  if (isManualBcvRateActive(modeConfig) && modeConfig.manualRate != null) {
    return buildManualExchangeRate(modeConfig.manualRate, reference);
  }

  const active = await getActiveGlobalExchangeRate(client, reference);
  if (active && active.rate > 0) return active;

  const { data, error } = await client
    .from("tasas_cambio")
    .select("moneda, tasa, ultima_actualizacion")
    .eq("moneda", "USD")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const tasa = Number(data.tasa) || 0;
  if (tasa <= 0) return null;

  const updatedAt = data.ultima_actualizacion as string;
  return {
    id: `tasas_cambio:${data.moneda}`,
    rate: roundExchangeRate(tasa),
    source: "bcv",
    // Fecha operativa de la última tasa conocida (carry-forward vía espejo).
    effective_date: getVenezuelaSyncDate(new Date(updatedAt)),
    notes: "Última tasa BCV válida (carry-forward)",
    store_id: null,
    created_at: updatedAt,
  };
}

/** @deprecated Prefer getActiveGlobalExchangeRate / getDisplayableUsdExchangeRate. */
export async function getLatestUsdTasa(
  client: SupabaseClient,
): Promise<TasaCambioRow | null> {
  const displayable = await getDisplayableUsdExchangeRate(client);
  if (!displayable) return null;

  return {
    moneda: "USD",
    tasa: displayable.rate,
    ultima_actualizacion: displayable.created_at,
  };
}
