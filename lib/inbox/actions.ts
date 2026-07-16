"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserStore } from "@/lib/stores";
import type { ChannelMessage, InboxConversationStatus } from "@/lib/inbox/types";
import type { InboxSalesStatus } from "@/lib/inbox/sales-status";
import { isInboxSalesStatus } from "@/lib/inbox/sales-status";
import { isPersistedConversation } from "@/lib/inbox/contact-context";
import {
  appendActivityEntries,
  createActivityEntry,
  getSalesStatusActivityLabel,
} from "@/lib/inbox/contact-crm";
import {
  fetchContactCrmByContactIds,
  type ContactCrmSnapshot,
} from "@/lib/inbox/contact-crm-data";
import { getIntegrationAccessToken } from "@/lib/inbox/integration-token";
import { sendWhatsAppTextMessage } from "@/lib/inbox/whatsapp-client";
import {
  getStoreInboxConversations,
  mapInboxMessageRowToChannelMessage,
  type MessageConversation,
} from "@/lib/inbox/get-store-messages";

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

export async function fetchInboxContactsList(): Promise<{
  error?: string;
  conversations?: MessageConversation[];
}> {
  const supabase = await createClient();
  const store = await getUserStore(supabase);

  if (!store) {
    return { error: "No tienes una tienda asociada." };
  }

  try {
    const conversations = await getStoreInboxConversations(supabase, store.id, {
      storeCountry: store.country,
    });
    return { conversations };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "No se pudieron cargar los contactos del inbox.";
    return { error: message };
  }
}

export async function fetchInboxConversationMessages(
  conversationId: string,
): Promise<{ error?: string; messages?: ChannelMessage[] }> {
  const ownership = await getOwnedConversation(conversationId);
  if (ownership.error || !ownership.storeId) {
    return { error: ownership.error };
  }

  const supabase = await createClient();
  const { data: conversation, error: conversationError } = await supabase
    .from("inbox_conversations")
    .select(
      `
      id,
      integration_id,
      inbox_contacts (
        external_id
      )
    `,
    )
    .eq("id", conversationId)
    .eq("store_id", ownership.storeId)
    .maybeSingle();

  if (conversationError) {
    return { error: conversationError.message };
  }

  if (!conversation) {
    return { error: "Conversación no encontrada." };
  }

  const contact = conversation.inbox_contacts as
    | { external_id?: string }
    | { external_id?: string }[]
    | null;
  const senderId = Array.isArray(contact)
    ? (contact[0]?.external_id ?? "unknown")
    : (contact?.external_id ?? "unknown");

  const { data: rows, error: messagesError } = await supabase
    .from("inbox_messages")
    .select(
      "id, conversation_id, body, direction, status, created_at, sent_at, delivered_at, read_at",
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (messagesError) {
    return { error: messagesError.message };
  }

  const messages = (rows ?? []).map((row) =>
    mapInboxMessageRowToChannelMessage(
      row,
      conversation.integration_id ?? "",
      senderId,
    ),
  );

  return { messages };
}

export async function sendInboxMessage(
  conversationId: string,
  body: string,
): Promise<{ error?: string; message?: ChannelMessage }> {
  const trimmedBody = body.trim();
  if (!trimmedBody) {
    return { error: "Escribe un mensaje antes de enviar." };
  }

  const ownership = await getOwnedConversation(conversationId);
  if (ownership.error || !ownership.storeId) {
    return { error: ownership.error };
  }

  const supabase = await createClient();
  const { data: conversation, error: conversationError } = await supabase
    .from("inbox_conversations")
    .select(
      `
      id,
      provider,
      integration_id,
      inbox_contacts (
        external_id
      )
    `,
    )
    .eq("id", conversationId)
    .eq("store_id", ownership.storeId)
    .maybeSingle();

  if (conversationError) {
    return { error: conversationError.message };
  }

  if (!conversation) {
    return { error: "Conversación no encontrada." };
  }

  if (!conversation.integration_id) {
    return { error: "Esta conversación no tiene integración de WhatsApp vinculada." };
  }

  const { data: integration, error: integrationError } = await supabase
    .from("channel_integrations")
    .select("id, provider, external_account_id, config, is_active")
    .eq("id", conversation.integration_id)
    .eq("store_id", ownership.storeId)
    .maybeSingle();

  if (integrationError) {
    return { error: integrationError.message };
  }

  if (!integration?.is_active) {
    return { error: "La integración de WhatsApp no está activa." };
  }

  if (integration.provider !== "whatsapp") {
    return { error: "Solo WhatsApp admite respuesta desde aquí." };
  }

  const contact = conversation.inbox_contacts as
    | { external_id?: string }
    | { external_id?: string }[]
    | null;
  const recipientId = Array.isArray(contact)
    ? contact[0]?.external_id
    : contact?.external_id;

  if (!recipientId?.trim()) {
    return { error: "No se encontró el destinatario de WhatsApp." };
  }

  const accessToken = await getIntegrationAccessToken(integration.id);
  if (!accessToken) {
    return { error: "Token de WhatsApp no disponible. Reconecta la integración." };
  }

  const config = (integration.config ?? {}) as Record<string, unknown>;
  const phoneNumberId =
    typeof config.phone_number_id === "string"
      ? config.phone_number_id
      : integration.external_account_id;

  let messageId: string;
  try {
    const result = await sendWhatsAppTextMessage({
      phoneNumberId,
      accessToken,
      to: recipientId.trim(),
      body: trimmedBody,
    });
    messageId = result.messageId;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo enviar el mensaje.";
    return { error: message };
  }

  const sentAt = new Date().toISOString();
  const { data: inserted, error: insertError } = await supabase
    .from("inbox_messages")
    .insert({
      store_id: ownership.storeId,
      conversation_id: conversationId,
      direction: "outbound",
      sender_type: "agent",
      body: trimmedBody,
      message_type: "text",
      external_message_id: messageId,
      status: "sent",
      sent_at: sentAt,
    })
    .select(
      "id, conversation_id, body, direction, status, created_at, sent_at, delivered_at, read_at",
    )
    .single();

  if (insertError || !inserted) {
    return { error: insertError?.message ?? "Mensaje enviado pero no guardado." };
  }

  revalidatePath("/dashboard/mensajes");

  return {
    message: mapInboxMessageRowToChannelMessage(
      inserted,
      conversation.integration_id ?? integration.id,
      recipientId.trim(),
    ),
  };
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

export async function updateInboxConversationSalesStatus(
  conversationId: string,
  salesStatus: InboxSalesStatus,
): Promise<{ error?: string }> {
  if (!isInboxSalesStatus(salesStatus)) {
    return { error: "Estado de venta no válido." };
  }

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
    sales_status: salesStatus,
    activity_log: appendActivityEntries(
      (conversation.metadata as Record<string, unknown> | null)?.activity_log,
      [createActivityEntry(getSalesStatusActivityLabel(salesStatus), "status")],
    ),
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

export async function fetchInboxContactCrm(
  contactId: string,
): Promise<{ error?: string; data?: ContactCrmSnapshot }> {
  const normalizedContactId = contactId.trim();
  if (!normalizedContactId) {
    return { error: "Contacto no válido." };
  }

  const supabase = await createClient();
  const store = await getUserStore(supabase);

  if (!store) {
    return { error: "No tienes una tienda asociada." };
  }

  const { data: contact } = await supabase
    .from("inbox_contacts")
    .select("id")
    .eq("id", normalizedContactId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (!contact) {
    return { error: "Contacto no encontrado." };
  }

  try {
    const crmByContactId = await fetchContactCrmByContactIds(
      supabase,
      store.id,
      [normalizedContactId],
    );

    return {
      data: crmByContactId.get(normalizedContactId) ?? {
        privateNotes: "",
        tags: [],
      },
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudo cargar el CRM del contacto.";
    return { error: message };
  }
}

export async function updateInboxContactPrivateNotes(
  contactId: string,
  privateNotes: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const store = await getUserStore(supabase);

  if (!store) {
    return { error: "No tienes una tienda asociada." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: contact } = await supabase
    .from("inbox_contacts")
    .select("id")
    .eq("id", contactId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (!contact) {
    return { error: "Contacto no encontrado." };
  }

  const normalizedNotes = privateNotes.trim();

  if (!normalizedNotes) {
    const { error } = await supabase
      .from("contact_notes")
      .delete()
      .eq("contact_id", contactId)
      .eq("store_id", store.id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/dashboard/mensajes");
    return {};
  }

  const { error } = await supabase.from("contact_notes").upsert(
    {
      store_id: store.id,
      contact_id: contactId,
      body: normalizedNotes,
      created_by: user?.id ?? null,
      updated_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "contact_id" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/mensajes");
  return {};
}

export async function appendInboxConversationActivity(
  conversationId: string,
  label: string,
  type = "event",
): Promise<{ error?: string }> {
  if (!label.trim()) {
    return { error: "Actividad no válida." };
  }

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
    activity_log: appendActivityEntries(
      (conversation.metadata as Record<string, unknown> | null)?.activity_log,
      [createActivityEntry(label.trim(), type)],
    ),
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

export async function updateInboxContactTags(
  contactId: string,
  tags: string[],
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const store = await getUserStore(supabase);

  if (!store) {
    return { error: "No tienes una tienda asociada." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: contact } = await supabase
    .from("inbox_contacts")
    .select("id")
    .eq("id", contactId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (!contact) {
    return { error: "Contacto no encontrado." };
  }

  const normalizedTags = [
    ...new Set(
      tags
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => tag.slice(0, 48)),
    ),
  ];

  const { error: deleteError } = await supabase
    .from("contact_tags")
    .delete()
    .eq("contact_id", contactId)
    .eq("store_id", store.id);

  if (deleteError) {
    return { error: deleteError.message };
  }

  if (normalizedTags.length === 0) {
    revalidatePath("/dashboard/mensajes");
    return {};
  }

  const { error: insertError } = await supabase.from("contact_tags").insert(
    normalizedTags.map((label) => ({
      store_id: store.id,
      contact_id: contactId,
      label,
      created_by: user?.id ?? null,
    })),
  );

  if (insertError) {
    return { error: insertError.message };
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
