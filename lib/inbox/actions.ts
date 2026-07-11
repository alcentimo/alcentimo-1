"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserStore } from "@/lib/stores";

export async function markInboxConversationRead(
  conversationId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const store = await getUserStore(supabase);

  if (!store) {
    return { error: "No tienes una tienda asociada." };
  }

  const { data: conversation } = await supabase
    .from("inbox_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (!conversation) {
    return { error: "Conversación no encontrada." };
  }

  const { error: messagesError } = await supabase
    .from("inbox_messages")
    .update({ status: "read" })
    .eq("conversation_id", conversationId)
    .eq("direction", "inbound")
    .eq("status", "received");

  if (messagesError) {
    return { error: messagesError.message };
  }

  const { error: conversationError } = await supabase
    .from("inbox_conversations")
    .update({ unread_count: 0, updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  if (conversationError) {
    return { error: conversationError.message };
  }

  revalidatePath("/dashboard/mensajes");
  return {};
}

/** @deprecated Usar markInboxConversationRead. */
export async function markChannelMessagesRead(
  integrationId: string,
  senderId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const store = await getUserStore(supabase);

  if (!store) {
    return { error: "No tienes una tienda asociada." };
  }

  const { data: contact } = await supabase
    .from("inbox_contacts")
    .select("id")
    .eq("store_id", store.id)
    .eq("external_id", senderId)
    .maybeSingle();

  if (!contact) {
    return { error: "Contacto no encontrado." };
  }

  const { data: conversation } = await supabase
    .from("inbox_conversations")
    .select("id")
    .eq("store_id", store.id)
    .eq("contact_id", contact.id)
    .eq("integration_id", integrationId)
    .maybeSingle();

  if (!conversation) {
    return { error: "Conversación no encontrada." };
  }

  return markInboxConversationRead(conversation.id);
}
