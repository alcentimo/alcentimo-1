"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserStore } from "@/lib/stores";
import type { ChannelProviderKey } from "@/src/config/channel-integrations";
import { CHANNEL_INTEGRATIONS } from "@/src/config/channel-integrations";

const VALID_PROVIDERS = new Set<ChannelProviderKey>(
  CHANNEL_INTEGRATIONS.map((channel) => channel.key),
);

export async function disconnectChannelIntegration(
  provider: ChannelProviderKey,
): Promise<{ error?: string }> {
  if (!VALID_PROVIDERS.has(provider)) {
    return { error: "Plataforma no válida." };
  }

  const supabase = await createClient();
  const store = await getUserStore(supabase);

  if (!store) {
    return { error: "No tienes una tienda asociada." };
  }

  const { error } = await supabase
    .from("channel_integrations")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("store_id", store.id)
    .eq("provider", provider);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/ajustes/integraciones");
  revalidatePath("/dashboard/mensajes");
  return {};
}
