import type { ChannelMessage, InboxProvider } from "@/lib/inbox/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface MessageConversation {
  conversationId: string;
  senderId: string;
  provider: InboxProvider;
  integrationId: string;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
  messages: ChannelMessage[];
}

interface InboxConversationRow {
  id: string;
  integration_id: string | null;
  provider: InboxProvider;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  inbox_contacts:
    | {
        external_id: string;
        display_name: string | null;
      }
    | {
        external_id: string;
        display_name: string | null;
      }[]
    | null;
}

function resolveContact(
  contact: InboxConversationRow["inbox_contacts"],
): { external_id: string; display_name: string | null } | null {
  if (!contact) return null;
  if (Array.isArray(contact)) return contact[0] ?? null;
  return contact;
}

interface InboxMessageRow {
  id: string;
  conversation_id: string;
  body: string | null;
  direction: "inbound" | "outbound";
  status: string;
  created_at: string;
  sent_at: string | null;
}

function mapInboxMessageToChannelMessage(
  message: InboxMessageRow,
  conversation: InboxConversationRow,
): ChannelMessage {
  const contact = resolveContact(conversation.inbox_contacts);
  const senderId = contact?.external_id ?? "unknown";
  const integrationId = conversation.integration_id ?? "";

  return {
    id: message.id,
    integration_id: integrationId,
    sender_id: senderId,
    message_text: message.body,
    direction: message.direction,
    status:
      message.direction === "inbound" && message.status === "received"
        ? "unread"
        : "read",
    created_at: message.sent_at ?? message.created_at,
  };
}

export async function getStoreChannelMessages(
  supabase: SupabaseClient,
  storeId: string,
): Promise<ChannelMessage[]> {
  const conversations = await getStoreInboxConversations(supabase, storeId);
  return conversations.flatMap((conversation) => conversation.messages);
}

export async function getStoreInboxConversations(
  supabase: SupabaseClient,
  storeId: string,
): Promise<MessageConversation[]> {
  const { data: conversationRows, error: conversationsError } = await supabase
    .from("inbox_conversations")
    .select(
      `
      id,
      integration_id,
      provider,
      unread_count,
      last_message_at,
      last_message_preview,
      inbox_contacts (
        external_id,
        display_name
      )
    `,
    )
    .eq("store_id", storeId)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (conversationsError) throw conversationsError;

  const conversations = (conversationRows ?? []) as InboxConversationRow[];
  if (conversations.length === 0) return [];

  const conversationIds = conversations.map((row) => row.id);
  const { data: messageRows, error: messagesError } = await supabase
    .from("inbox_messages")
    .select("id, conversation_id, body, direction, status, created_at, sent_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: true });

  if (messagesError) throw messagesError;

  const messagesByConversation = new Map<string, InboxMessageRow[]>();
  for (const message of (messageRows ?? []) as InboxMessageRow[]) {
    const bucket = messagesByConversation.get(message.conversation_id) ?? [];
    bucket.push(message);
    messagesByConversation.set(message.conversation_id, bucket);
  }

  return conversations.map((conversation) => {
    const contact = resolveContact(conversation.inbox_contacts);
    const senderId = contact?.external_id ?? "unknown";
    const threadMessages = messagesByConversation.get(conversation.id) ?? [];

    return {
      conversationId: conversation.id,
      senderId,
      provider: conversation.provider,
      integrationId: conversation.integration_id ?? "",
      lastMessage: conversation.last_message_preview,
      lastMessageAt:
        conversation.last_message_at ??
        threadMessages.at(-1)?.created_at ??
        new Date(0).toISOString(),
      unreadCount: conversation.unread_count,
      messages: threadMessages.map((message) =>
        mapInboxMessageToChannelMessage(message, conversation),
      ),
    };
  });
}

export function buildMessageConversations(
  messages: ChannelMessage[],
): MessageConversation[] {
  const map = new Map<string, MessageConversation>();

  for (const message of messages) {
    const key = `${message.integration_id}:${message.sender_id}`;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        conversationId: key,
        senderId: message.sender_id,
        provider: "whatsapp",
        integrationId: message.integration_id,
        lastMessage: message.message_text,
        lastMessageAt: message.created_at,
        unreadCount:
          message.direction === "inbound" && message.status === "unread" ? 1 : 0,
        messages: [message],
      });
      continue;
    }

    existing.messages.push(message);

    if (Date.parse(message.created_at) > Date.parse(existing.lastMessageAt)) {
      existing.lastMessage = message.message_text;
      existing.lastMessageAt = message.created_at;
      existing.integrationId = message.integration_id;
    }

    if (message.direction === "inbound" && message.status === "unread") {
      existing.unreadCount += 1;
    }
  }

  for (const conversation of map.values()) {
    conversation.messages.sort(
      (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
    );
  }

  return Array.from(map.values()).sort(
    (a, b) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt),
  );
}

export function formatSenderLabel(
  senderId: string,
  displayName?: string | null,
): string {
  if (displayName?.trim()) return displayName.trim();

  const digits = senderId.replace(/\D/g, "");
  if (digits.length >= 10) {
    return `+${digits}`;
  }
  return senderId;
}

export function formatMessageTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString("es-VE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("es-VE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
