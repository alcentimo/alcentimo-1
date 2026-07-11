import type { ChannelMessage } from "@/lib/inbox/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface MessageConversation {
  senderId: string;
  integrationId: string;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
  messages: ChannelMessage[];
}

export async function getStoreChannelMessages(
  supabase: SupabaseClient,
  storeId: string,
): Promise<ChannelMessage[]> {
  const { data: integrations, error: integrationsError } = await supabase
    .from("channel_integrations")
    .select("id")
    .eq("store_id", storeId)
    .eq("is_active", true);

  if (integrationsError) throw integrationsError;

  const integrationIds = (integrations ?? []).map((row) => row.id);
  if (integrationIds.length === 0) return [];

  const { data: messages, error: messagesError } = await supabase
    .from("channel_messages")
    .select("*")
    .in("integration_id", integrationIds)
    .order("created_at", { ascending: false });

  if (messagesError) throw messagesError;

  return (messages ?? []) as ChannelMessage[];
}

export function buildMessageConversations(
  messages: ChannelMessage[],
): MessageConversation[] {
  const map = new Map<string, MessageConversation>();

  for (const message of messages) {
    const existing = map.get(message.sender_id);

    if (!existing) {
      map.set(message.sender_id, {
        senderId: message.sender_id,
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

export function formatSenderLabel(senderId: string): string {
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
