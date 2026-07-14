import type { SupabaseClient } from "@supabase/supabase-js";

export interface BcvSyncAlert {
  id: string;
  message: string;
  detail: string | null;
  syncDate: string;
  createdAt: string;
}

/** Alerta activa de fallo BCV (visible en el panel tras reintento fallido). */
export async function getActiveBcvSyncAlert(
  client: SupabaseClient,
): Promise<BcvSyncAlert | null> {
  const { data, error } = await client
    .from("platform_alerts")
    .select("id, message, detail, sync_date, created_at")
    .eq("alert_type", "bcv_sync_failure")
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id as string,
    message: data.message as string,
    detail: (data.detail as string | null) ?? null,
    syncDate: data.sync_date as string,
    createdAt: data.created_at as string,
  };
}
