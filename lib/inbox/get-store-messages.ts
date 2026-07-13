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

interface ChannelMessageRow {
  id: string;
  integration_id: string;
  sender_id: string;
  message_text: string | null;
  direction: "inbound" | "outbound";
  status: "read" | "unread";
  created_at: string;
}

function mapChannelMessageRow(row: ChannelMessageRow): ChannelMessage {
  return {
    id: row.id,
    integration_id: row.integration_id,
    sender_id: row.sender_id,
    message_text: row.message_text,
    direction: row.direction,
    status: row.status,
    created_at: row.created_at,
  };
}

function conversationThreadKey(integrationId: string, senderId: string): string {
  return `${integrationId}:${senderId}`;
}

async function fetchChannelMessagesForStore(
  supabase: SupabaseClient,
  storeId: string,
): Promise<ChannelMessage[]> {
  const { data: integrations, error: integrationsError } = await supabase
    .from("channel_integrations")
    .select("id")
    .eq("store_id", storeId);

  if (integrationsError) throw integrationsError;

  const integrationIds = (integrations ?? []).map((row) => row.id);
  if (integrationIds.length === 0) return [];

  const { data: rows, error: messagesError } = await supabase
    .from("channel_messages")
    .select(
      "id, integration_id, sender_id, message_text, direction, status, created_at",
    )
    .in("integration_id", integrationIds)
    .order("created_at", { ascending: true });

  if (messagesError) throw messagesError;

  return ((rows ?? []) as ChannelMessageRow[]).map(mapChannelMessageRow);
}

function groupChannelMessagesByThread(
  messages: ChannelMessage[],
): Map<string, ChannelMessage[]> {
  const map = new Map<string, ChannelMessage[]>();

  for (const message of messages) {
    const key = conversationThreadKey(message.integration_id, message.sender_id);
    const bucket = map.get(key) ?? [];
    bucket.push(message);
    map.set(key, bucket);
  }

  return map;
}

function mergeChannelMessagesIntoConversations(
  conversations: MessageConversation[],
  channelMessages: ChannelMessage[],
): MessageConversation[] {
  if (channelMessages.length === 0) return conversations;

  const byThread = groupChannelMessagesByThread(channelMessages);

  return conversations.map((conversation) => {
    const legacyMessages = conversation.integrationId
      ? (byThread.get(
          conversationThreadKey(
            conversation.integrationId,
            conversation.senderId,
          ),
        ) ?? [])
      : channelMessages.filter(
          (message) => message.sender_id === conversation.senderId,
        );

    if (conversation.messages.length > 0) {
      if (conversation.lastMessage?.trim()) return conversation;

      const lastLegacy = legacyMessages.at(-1);
      return {
        ...conversation,
        lastMessage:
          conversation.lastMessage ??
          lastLegacy?.message_text ??
          conversation.lastMessage,
      };
    }

    if (legacyMessages.length === 0) return conversation;

    const lastLegacy = legacyMessages.at(-1);

    return {
      ...conversation,
      messages: legacyMessages,
      lastMessage:
        conversation.lastMessage ??
        lastLegacy?.message_text ??
        null,
      lastMessageAt:
        conversation.lastMessageAt &&
        Date.parse(conversation.lastMessageAt) > 0
          ? conversation.lastMessageAt
          : (lastLegacy?.created_at ?? conversation.lastMessageAt),
      unreadCount:
        conversation.unreadCount > 0
          ? conversation.unreadCount
          : legacyMessages.filter(
              (message) =>
                message.direction === "inbound" && message.status === "unread",
            ).length,
    };
  });
}

function applyIntegrationProviders(
  conversations: MessageConversation[],
  providerByIntegrationId: Map<string, MessageConversation["provider"]>,
): MessageConversation[] {
  return conversations.map((conversation) => ({
    ...conversation,
    provider:
      providerByIntegrationId.get(conversation.integrationId) ??
      conversation.provider,
  }));
}

async function fetchIntegrationProviders(
  supabase: SupabaseClient,
  storeId: string,
): Promise<Map<string, MessageConversation["provider"]>> {
  const { data, error } = await supabase
    .from("channel_integrations")
    .select("id, provider")
    .eq("store_id", storeId);

  if (error) throw error;

  return new Map(
    (data ?? []).map((row) => [
      row.id,
      row.provider as MessageConversation["provider"],
    ]),
  );
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
  const providerByIntegrationId = await fetchIntegrationProviders(
    supabase,
    storeId,
  );

  if (conversations.length === 0) {
    const channelMessages = await fetchChannelMessagesForStore(supabase, storeId);
    if (channelMessages.length > 0) {
      return applyIntegrationProviders(
        buildMessageConversations(channelMessages),
        providerByIntegrationId,
      );
    }
    return [];
  }

  const conversationIds = conversations.map((row) => row.id);
  const { data: messageRows, error: messagesError } = await supabase
    .from("inbox_messages")
    .select("id, conversation_id, body, direction, status, created_at, sent_at")
    .eq("store_id", storeId)
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: true });

  if (messagesError) throw messagesError;

  const messagesByConversation = new Map<string, InboxMessageRow[]>();
  for (const message of (messageRows ?? []) as InboxMessageRow[]) {
    const bucket = messagesByConversation.get(message.conversation_id) ?? [];
    bucket.push(message);
    messagesByConversation.set(message.conversation_id, bucket);
  }

  const inboxConversations = conversations.map((conversation) => {
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

  const channelMessages = await fetchChannelMessagesForStore(supabase, storeId);
  const merged = mergeChannelMessagesIntoConversations(
    inboxConversations,
    channelMessages,
  );

  const hasInboxMessages = merged.some(
    (conversation) => conversation.messages.length > 0,
  );

  if (!hasInboxMessages && channelMessages.length > 0) {
    return applyIntegrationProviders(
      buildMessageConversations(channelMessages),
      providerByIntegrationId,
    );
  }

  return merged;
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
