"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserStore } from "@/lib/stores";
import type { InboxConversationStatus } from "@/lib/inbox/types";
import { isPersistedConversation } from "@/lib/inbox/contact-context";

const VALID_STATUSES = new Set<InboxConversationStatus>([
  "open",
  "pending",
  "closed",
]);

const ASSIGNMENT_TEAMS = new Set(["ventas", "soporte", "logistica"]);

async function getOwnedConversation(
  conversationId: string,
): Promise<{ error?: string; storeId?: string }> {
  if (!isPersistedConversation(conversationId)) {
    return { error: "Esta conversación aún no está sincronizada en el inbox." };
  }

  const supabase = await createClient();
  const store = await getUserStore(supabase);

  if (!store) {
    return { error: "No tienes una tienda asociada." };
  }

  const { data: conversation } = await supabase
    .from("inbox_conversations")
    .select("id, metadata")
    .eq("id", conversationId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (!conversation) {
    return { error: "Conversación no encontrada." };
  }

  return { storeId: store.id };
}

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

export async function updateInboxConversationStatus(
  conversationId: string,
  status: InboxConversationStatus,
): Promise<{ error?: string }> {
  if (!VALID_STATUSES.has(status)) {
    return { error: "Estado no válido." };
  }

  const ownership = await getOwnedConversation(conversationId);
  if (ownership.error || !ownership.storeId) {
    return { error: ownership.error };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("inbox_conversations")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("store_id", ownership.storeId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/mensajes");
  return {};
}

export async function archiveInboxConversation(
  conversationId: string,
): Promise<{ error?: string }> {
  return updateConversationMetadata(conversationId, { archived: true });
}

export async function markInboxConversationSpam(
  conversationId: string,
): Promise<{ error?: string }> {
  return updateConversationMetadata(conversationId, { spam: true });
}

export async function assignInboxConversationTeam(
  conversationId: string,
  team: string,
): Promise<{ error?: string }> {
  if (!ASSIGNMENT_TEAMS.has(team)) {
    return { error: "Equipo no válido." };
  }

  return updateConversationMetadata(conversationId, { assigned_team: team });
}

export async function updateInboxContactTags(
  contactId: string,
  tags: string[],
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const store = await getUserStore(supabase);

  if (!store) {
    return { error: "No tienes una tienda asociada." };
  }

  const { data: contact } = await supabase
    .from("inbox_contacts")
    .select("id, metadata")
    .eq("id", contactId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (!contact) {
    return { error: "Contacto no encontrado." };
  }

  const metadata = {
    ...((contact.metadata as Record<string, unknown> | null) ?? {}),
    tags,
  };

  const { error } = await supabase
    .from("inbox_contacts")
    .update({ metadata, updated_at: new Date().toISOString() })
    .eq("id", contactId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/mensajes");
  return {};
}

async function updateConversationMetadata(
  conversationId: string,
  patch: Record<string, unknown>,
): Promise<{ error?: string }> {
  const ownership = await getOwnedConversation(conversationId);
  if (ownership.error || !ownership.storeId) {
    return { error: ownership.error };
  }

  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("inbox_conversations")
    .select("metadata")
    .eq("id", conversationId)
    .eq("store_id", ownership.storeId)
    .maybeSingle();

  if (!conversation) {
    return { error: "Conversación no encontrada." };
  }

  const metadata = {
    ...((conversation.metadata as Record<string, unknown> | null) ?? {}),
    ...patch,
  };

  const { error } = await supabase
    .from("inbox_conversations")
    .update({ metadata, updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/mensajes");
  return {};
}
