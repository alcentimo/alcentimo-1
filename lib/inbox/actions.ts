"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserStore } from "@/lib/stores";

export async function markChannelMessagesRead(
  integrationId: string,
  senderId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const store = await getUserStore(supabase);

  if (!store) {
    return { error: "No tienes una tienda asociada." };
  }

  const { data: integration } = await supabase
    .from("channel_integrations")
    .select("id")
    .eq("id", integrationId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (!integration) {
    return { error: "Integración no encontrada." };
  }

  const { error } = await supabase
    .from("channel_messages")
    .update({ status: "read" } as never)
    .eq("integration_id", integrationId)
    .eq("sender_id", senderId)
    .eq("direction", "inbound")
    .eq("status", "unread");

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/mensajes");
  return {};
}
