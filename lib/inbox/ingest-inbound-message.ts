import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InboxMessageType,
  InboxProvider,
} from "@/lib/inbox/types";

export interface IngestInboundInput {
  storeId: string;
  integrationId: string;
  provider: InboxProvider;
  senderId: string;
  platformMessageId: string;
  body: string | null;
  messageType?: InboxMessageType;
  sentAt?: string;
  rawPayload?: Record<string, unknown>;
  contactDisplayName?: string | null;
  contactPhone?: string | null;
}

export interface IngestInboundResult {
  inserted: boolean;
  messageId?: string;
  conversationId?: string;
  duplicate?: boolean;
}

function normalizePlatformMessageId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("platformMessageId is required for inbox ingest.");
  }
  return trimmed.slice(0, 512);
}

async function findExistingMessage(
  admin: SupabaseClient,
  storeId: string,
  platformMessageId: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from("inbox_messages")
    .select("id")
    .eq("store_id", storeId)
    .eq("external_message_id", platformMessageId)
    .maybeSingle();

  if (error) {
    console.error("[inbox/ingest] duplicate lookup failed:", error);
    throw error;
  }

  return data?.id ?? null;
}

async function upsertContact(
  admin: SupabaseClient,
  input: IngestInboundInput,
): Promise<string> {
  const { data: existing, error: existingError } = await admin
    .from("inbox_contacts")
    .select("id")
    .eq("store_id", input.storeId)
    .eq("provider", input.provider)
    .eq("external_id", input.senderId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) {
    const patch: Record<string, string> = {
      updated_at: new Date().toISOString(),
    };
    if (input.contactDisplayName) patch.display_name = input.contactDisplayName;
    if (input.contactPhone) patch.phone_e164 = input.contactPhone;

    if (Object.keys(patch).length > 1) {
      await admin.from("inbox_contacts").update(patch).eq("id", existing.id);
    }
    return existing.id;
  }

  const { data: created, error: createError } = await admin
    .from("inbox_contacts")
    .insert({
      store_id: input.storeId,
      provider: input.provider,
      external_id: input.senderId,
      display_name: input.contactDisplayName ?? null,
      phone_e164: input.contactPhone ?? null,
    })
    .select("id")
    .single();

  if (createError || !created) {
    throw createError ?? new Error("Failed to create inbox contact.");
  }

  return created.id;
}

async function upsertConversation(
  admin: SupabaseClient,
  input: IngestInboundInput,
  contactId: string,
): Promise<string> {
  const { data: existing, error: existingError } = await admin
    .from("inbox_conversations")
    .select("id")
    .eq("store_id", input.storeId)
    .eq("provider", input.provider)
    .eq("contact_id", contactId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) return existing.id;

  const { data: created, error: createError } = await admin
    .from("inbox_conversations")
    .insert({
      store_id: input.storeId,
      integration_id: input.integrationId,
      contact_id: contactId,
      provider: input.provider,
      status: "open",
      unread_count: 0,
    })
    .select("id")
    .single();

  if (createError || !created) {
    throw createError ?? new Error("Failed to create inbox conversation.");
  }

  return created.id;
}

/**
 * Registra un mensaje entrante en inbox_contacts → inbox_conversations → inbox_messages.
 * Idempotente por (store_id, external_message_id).
 */
export async function ingestInboundMessage(
  admin: SupabaseClient,
  input: IngestInboundInput,
): Promise<IngestInboundResult> {
  const platformMessageId = normalizePlatformMessageId(input.platformMessageId);
  const sentAt = input.sentAt ?? new Date().toISOString();

  const existingMessageId = await findExistingMessage(
    admin,
    input.storeId,
    platformMessageId,
  );

  if (existingMessageId) {
    return {
      inserted: false,
      duplicate: true,
      messageId: existingMessageId,
    };
  }

  const contactId = await upsertContact(admin, input);
  const conversationId = await upsertConversation(admin, input, contactId);

  const { data: message, error: insertError } = await admin
    .from("inbox_messages")
    .insert({
      store_id: input.storeId,
      conversation_id: conversationId,
      direction: "inbound",
      sender_type: "customer",
      body: input.body,
      message_type: input.messageType ?? "text",
      external_message_id: platformMessageId,
      status: "received",
      sent_at: sentAt,
      raw_payload: input.rawPayload ?? null,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return { inserted: false, duplicate: true, conversationId };
    }
    console.error("[inbox/ingest] insert failed:", insertError);
    throw insertError;
  }

  return {
    inserted: true,
    messageId: message.id,
    conversationId,
  };
}
