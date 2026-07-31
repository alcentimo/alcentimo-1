import type { SupabaseClient } from "@supabase/supabase-js";
import { getVenezuelaSyncDate } from "@/lib/exchange-rate/sync-date";
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
 * Tasa BCV vigente para mostrar precios.
 *
 * Regla de carry-forward: se toma la fila global con `effective_date <= hoy VE`
 * más reciente. Si el BCV se retrasa y publica pasada la medianoche (aún no hay
 * tasa con fecha de hoy), se mantiene temporalmente la última tasa válida
 * (ayer u anterior) para que la app nunca se quede sin precio.
 *
 * No adelanta tasas con vigencia futura (descargadas en la tarde para mañana).
 */
export async function getActiveGlobalExchangeRate(
  client: SupabaseClient,
  reference = new Date(),
): Promise<ExchangeRate | null> {
  const today = getVenezuelaSyncDate(reference);

  const { data, error } = await client
    .from("exchange_rate")
    .select("*")
    .is("store_id", null)
    .lte("effective_date", today)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return asExchangeRate(data as ExchangeRate);
}

/**
 * Última tasa usable para precios: carry-forward en exchange_rate,
 * y si no hay filas, espejo en tasas_cambio.
 */
export async function getDisplayableUsdExchangeRate(
  client: SupabaseClient,
  reference = new Date(),
): Promise<ExchangeRate | null> {
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
