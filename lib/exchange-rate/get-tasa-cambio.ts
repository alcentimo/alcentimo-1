import type { SupabaseClient } from "@supabase/supabase-js";

export interface TasaCambioRow {
  moneda: string;
  tasa: number;
  ultima_actualizacion: string;
}

export async function getLatestUsdTasa(
  client: SupabaseClient,
): Promise<TasaCambioRow | null> {
  const { data, error } = await client
    .from("tasas_cambio")
    .select("moneda, tasa, ultima_actualizacion")
    .eq("moneda", "USD")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    moneda: data.moneda as string,
    tasa: Number(data.tasa) || 0,
    ultima_actualizacion: data.ultima_actualizacion as string,
  };
}
