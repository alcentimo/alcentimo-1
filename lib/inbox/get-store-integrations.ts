import type { ChannelIntegration } from "@/lib/inbox/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChannelProviderKey } from "@/src/config/channel-integrations";

export async function getStoreIntegrations(
  supabase: SupabaseClient,
  storeId: string,
): Promise<ChannelIntegration[]> {
  const { data, error } = await supabase
    .from("channel_integrations")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []) as ChannelIntegration[];
}

export function hasActiveIntegrations(
  integrations: ChannelIntegration[],
): boolean {
  return integrations.some((integration) => integration.is_active);
}

export function getIntegrationForProvider(
  integrations: ChannelIntegration[],
  provider: ChannelProviderKey,
): ChannelIntegration | undefined {
  return integrations.find(
    (integration) => integration.provider === provider && integration.is_active,
  );
}
