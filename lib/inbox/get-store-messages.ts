import type {
  ChannelMessage,
  InboxConversationStatus,
  InboxMessageStatus,
  InboxProvider,
} from "@/lib/inbox/types";
import type { InboxSalesStatus } from "@/lib/inbox/sales-status";
import { normalizeSalesStatus } from "@/lib/inbox/sales-status";
import {
  parseActivityLog,
  readContactEmail,
  type ClientActivityEvent,
} from "@/lib/inbox/contact-crm";
import {
  fetchContactCrmByContactIds,
  resolveContactCrmSnapshot,
} from "@/lib/inbox/contact-crm-data";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface MessageConversation {
  conversationId: string;
  contactId: string | null;
  senderId: string;
  displayName: string | null;
  phoneE164: string | null;
  email: string | null;
  privateNotes: string;
  activityLog: ClientActivityEvent[];
  avatarUrl: string | null;
  provider: InboxProvider;
  integrationId: string;
  status: InboxConversationStatus;
  salesStatus: InboxSalesStatus;
  assignedTeam: string | null;
  tags: string[];
  country: string | null;
  isArchived: boolean;
  isSpam: boolean;
  isPriority: boolean;
  createdAt: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
  messages: ChannelMessage[];
}

interface InboxConversationRow {
  id: string;
  integration_id: string | null;
  provider: InboxProvider;
  status: InboxConversationStatus;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
  inbox_contacts:
    | {
        id: string;
        external_id: string;
        display_name: string | null;
        phone_e164: string | null;
        avatar_url: string | null;
        metadata: Record<string, unknown> | null;
      }
    | {
        id: string;
        external_id: string;
        display_name: string | null;
        phone_e164: string | null;
        avatar_url: string | null;
        metadata: Record<string, unknown> | null;
      }[]
    | null;
}

function resolveContact(
  contact: InboxConversationRow["inbox_contacts"],
): {
  id: string;
  external_id: string;
  display_name: string | null;
  phone_e164: string | null;
  avatar_url: string | null;
  metadata: Record<string, unknown> | null;
} | null {
  if (!contact) return null;
  if (Array.isArray(contact)) return contact[0] ?? null;
  return contact;
}

function readMetadataFlag(
  conversationMetadata: Record<string, unknown> | null,
  contactMetadata: Record<string, unknown> | null,
  key: string,
): boolean {
  return Boolean(conversationMetadata?.[key] ?? contactMetadata?.[key]);
}

function readMetadataString(
  conversationMetadata: Record<string, unknown> | null,
  contactMetadata: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = conversationMetadata?.[key] ?? contactMetadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function mapConversationRow(
  conversation: InboxConversationRow,
  threadMessages: ChannelMessage[],
  storeCountry: string | null,
  crmByContactId?: Map<string, import("@/lib/inbox/contact-crm-data").ContactCrmSnapshot>,
): MessageConversation {
  const contact = resolveContact(conversation.inbox_contacts);
  const senderId = contact?.external_id ?? "unknown";
  const contactMetadata = contact?.metadata ?? null;
  const conversationMetadata = conversation.metadata ?? null;
  const contactCrm = resolveContactCrmSnapshot(
    contact?.id,
    contactMetadata,
    conversationMetadata,
    crmByContactId,
  );
  const isArchived = readMetadataFlag(
    conversationMetadata,
    contactMetadata,
    "archived",
  );
  const isSpam = readMetadataFlag(conversationMetadata, contactMetadata, "spam");
  const assignedTeam = readMetadataString(
    conversationMetadata,
    contactMetadata,
    "assigned_team",
  );
  const country =
    readMetadataString(conversationMetadata, contactMetadata, "country") ??
    storeCountry;
  const salesStatus = normalizeSalesStatus(conversationMetadata?.sales_status);
  const privateNotes = contactCrm.privateNotes;
  const uniqueTags = contactCrm.tags;
  const email = readContactEmail(contactMetadata);
  const activityLog = parseActivityLog(conversationMetadata?.activity_log);
  const isPriority =
    conversation.status === "pending" ||
    conversation.unread_count > 0 ||
    readMetadataFlag(conversationMetadata, contactMetadata, "priority");

  return {
    conversationId: conversation.id,
    contactId: contact?.id ?? null,
    senderId,
    displayName: contact?.display_name ?? null,
    phoneE164: contact?.phone_e164 ?? null,
    email,
    privateNotes,
    activityLog,
    avatarUrl: contact?.avatar_url ?? null,
    provider: conversation.provider,
    integrationId: conversation.integration_id ?? "",
    status: conversation.status,
    salesStatus,
    assignedTeam,
    tags: uniqueTags,
    country,
    isArchived,
    isSpam,
    isPriority,
    createdAt: conversation.created_at,
    lastMessage: conversation.last_message_preview,
    lastMessageAt:
      conversation.last_message_at ??
      threadMessages.at(-1)?.created_at ??
      new Date(0).toISOString(),
    unreadCount: conversation.unread_count,
    messages: threadMessages,
  };
}

function mapLegacyConversation(
  key: string,
  messages: ChannelMessage[],
  provider: InboxProvider,
  storeCountry: string | null,
): MessageConversation {
  const [integrationId, senderId] = key.split(":");
  const lastMessage = messages.at(-1);

  return {
    conversationId: key,
    contactId: null,
    senderId: senderId ?? "unknown",
    displayName: null,
    phoneE164: null,
    email: null,
    privateNotes: "",
    activityLog: [],
    avatarUrl: null,
    provider,
    integrationId: integrationId ?? "",
    status: "open",
    salesStatus: "new",
    assignedTeam: null,
    tags: [],
    country: storeCountry,
    isArchived: false,
    isSpam: false,
    isPriority: messages.some(
      (message) => message.direction === "inbound" && message.status === "unread",
    ),
    createdAt: messages[0]?.created_at ?? null,
    lastMessage: lastMessage?.message_text ?? null,
    lastMessageAt: lastMessage?.created_at ?? new Date(0).toISOString(),
    unreadCount: messages.filter(
      (message) => message.direction === "inbound" && message.status === "unread",
    ).length,
    messages,
  };
}

interface InboxMessageRow {
  id: string;
  conversation_id: string;
  body: string | null;
  direction: "inbound" | "outbound";
  status: string;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
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
  const isInbound = message.direction === "inbound";
  const inboxStatus = message.status as InboxMessageStatus;

  return {
    id: message.id,
    integration_id: integrationId,
    sender_id: senderId,
    message_text: message.body,
    direction: message.direction,
    status: isInbound && inboxStatus === "received" ? "unread" : "read",
    deliveryStatus: isInbound ? undefined : inboxStatus,
    created_at: message.sent_at ?? message.created_at,
  };
}

export function mapInboxMessageRowToChannelMessage(
  message: InboxMessageRow,
  integrationId: string,
  senderId: string,
): ChannelMessage {
  const isInbound = message.direction === "inbound";
  const inboxStatus = message.status as InboxMessageStatus;

  return {
    id: message.id,
    integration_id: integrationId,
    sender_id: senderId,
    message_text: message.body,
    direction: message.direction,
    status: isInbound && inboxStatus === "received" ? "unread" : "read",
    deliveryStatus: isInbound ? undefined : inboxStatus,
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
  options?: { storeCountry?: string | null },
): Promise<MessageConversation[]> {
  const storeCountry = options?.storeCountry ?? null;

  const { data: conversationRows, error: conversationsError } = await supabase
    .from("inbox_conversations")
    .select(
      `
      id,
      integration_id,
      provider,
      status,
      unread_count,
      last_message_at,
      last_message_preview,
      created_at,
      metadata,
      inbox_contacts (
        id,
        external_id,
        display_name,
        phone_e164,
        avatar_url,
        metadata
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
      return enrichConversationsWithContacts(
        supabase,
        storeId,
        applyIntegrationProviders(
          buildMessageConversations(channelMessages, storeCountry),
          providerByIntegrationId,
        ),
      );
    }
    return [];
  }

  const conversationIds = conversations.map((row) => row.id);
  const { data: messageRows, error: messagesError } = await supabase
    .from("inbox_messages")
    .select(
      "id, conversation_id, body, direction, status, created_at, sent_at, delivered_at, read_at",
    )
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
    const threadMessages = (messagesByConversation.get(conversation.id) ?? []).map(
      (message) => mapInboxMessageToChannelMessage(message, conversation),
    );

    return mapConversationRow(conversation, threadMessages, storeCountry);
  });

  const contactIdsForCrm = [
    ...new Set(
      inboxConversations
        .map((conversation) => conversation.contactId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const crmByContactId = await fetchContactCrmByContactIds(
    supabase,
    storeId,
    contactIdsForCrm,
  );
  const inboxConversationsWithCrm = inboxConversations.map((conversation) => {
    if (!conversation.contactId) return conversation;
    const crm = crmByContactId.get(conversation.contactId);
    if (!crm) return conversation;
    return {
      ...conversation,
      privateNotes: crm.privateNotes,
      tags: crm.tags,
    };
  });

  const channelMessages = await fetchChannelMessagesForStore(supabase, storeId);
  const merged = mergeChannelMessagesIntoConversations(
    inboxConversationsWithCrm,
    channelMessages,
  );

  const hasInboxMessages = merged.some(
    (conversation) => conversation.messages.length > 0,
  );

  if (!hasInboxMessages && channelMessages.length > 0) {
    return enrichConversationsWithContacts(
      supabase,
      storeId,
      applyIntegrationProviders(
        buildMessageConversations(channelMessages, storeCountry),
        providerByIntegrationId,
      ),
    );
  }

  return enrichConversationsWithContacts(supabase, storeId, merged, crmByContactId);
}

async function applyContactCrmToConversations(
  supabase: SupabaseClient,
  storeId: string,
  conversations: MessageConversation[],
  existingCrmByContactId?: Map<string, import("@/lib/inbox/contact-crm-data").ContactCrmSnapshot>,
): Promise<MessageConversation[]> {
  const contactIds = [
    ...new Set(
      conversations
        .map((conversation) => conversation.contactId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (contactIds.length === 0) {
    return conversations;
  }

  const crmByContactId =
    existingCrmByContactId ??
    (await fetchContactCrmByContactIds(supabase, storeId, contactIds));

  return conversations.map((conversation) => {
    if (!conversation.contactId) return conversation;
    const crm = crmByContactId.get(conversation.contactId);
    if (!crm) return conversation;

    return {
      ...conversation,
      privateNotes: crm.privateNotes,
      tags: crm.tags,
    };
  });
}

async function enrichConversationsWithContacts(
  supabase: SupabaseClient,
  storeId: string,
  conversations: MessageConversation[],
  existingCrmByContactId?: Map<string, import("@/lib/inbox/contact-crm-data").ContactCrmSnapshot>,
): Promise<MessageConversation[]> {
  if (conversations.length === 0) return conversations;

  const contactIds = [
    ...new Set(
      conversations
        .map((conversation) => conversation.contactId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const unresolvedExternalIds = [
    ...new Set(
      conversations
        .filter(
          (conversation) =>
            !conversation.contactId && conversation.senderId !== "unknown",
        )
        .map((conversation) => conversation.senderId),
    ),
  ];

  if (contactIds.length === 0 && unresolvedExternalIds.length === 0) {
    return conversations;
  }

  const [byIdResult, byExternalResult] = await Promise.all([
    contactIds.length > 0
      ? supabase
          .from("inbox_contacts")
          .select(
            "id, external_id, display_name, phone_e164, avatar_url, metadata",
          )
          .eq("store_id", storeId)
          .in("id", contactIds)
      : Promise.resolve({ data: [], error: null }),
    unresolvedExternalIds.length > 0
      ? supabase
          .from("inbox_contacts")
          .select(
            "id, external_id, display_name, phone_e164, avatar_url, metadata",
          )
          .eq("store_id", storeId)
          .in("external_id", unresolvedExternalIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (byIdResult.error) throw byIdResult.error;
  if (byExternalResult.error) throw byExternalResult.error;

  const contacts = [
    ...((byIdResult.data ?? []) as NonNullable<typeof byIdResult.data>),
    ...((byExternalResult.data ?? []) as NonNullable<
      typeof byExternalResult.data
    >),
  ];

  const contactById = new Map(
    (contacts ?? []).map((contact) => [contact.id, contact]),
  );
  const contactByExternalId = new Map(
    (contacts ?? []).map((contact) => [contact.external_id, contact]),
  );

  const enriched = conversations.map((conversation) => {
    const contact =
      (conversation.contactId
        ? contactById.get(conversation.contactId)
        : null) ?? contactByExternalId.get(conversation.senderId);

    if (!contact) return conversation;

    const contactMetadata =
      (contact.metadata as Record<string, unknown> | null) ?? null;
    const contactCrm = resolveContactCrmSnapshot(
      contact.id,
      contactMetadata,
      null,
      existingCrmByContactId,
    );

    return {
      ...conversation,
      contactId: conversation.contactId ?? contact.id,
      displayName: conversation.displayName ?? contact.display_name,
      phoneE164: conversation.phoneE164 ?? contact.phone_e164,
      avatarUrl: conversation.avatarUrl ?? contact.avatar_url,
      privateNotes: contactCrm.privateNotes || conversation.privateNotes,
      tags: contactCrm.tags.length > 0 ? contactCrm.tags : conversation.tags,
    };
  });

  return await applyContactCrmToConversations(
    supabase,
    storeId,
    enriched,
    existingCrmByContactId,
  );
}

export function buildMessageConversations(
  messages: ChannelMessage[],
  storeCountry: string | null = null,
): MessageConversation[] {
  const map = new Map<string, ChannelMessage[]>();

  for (const message of messages) {
    const key = `${message.integration_id}:${message.sender_id}`;
    const bucket = map.get(key) ?? [];
    bucket.push(message);
    map.set(key, bucket);
  }

  const conversations = Array.from(map.entries()).map(([key, threadMessages]) => {
    threadMessages.sort(
      (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
    );

    return mapLegacyConversation(
      key,
      threadMessages,
      "whatsapp",
      storeCountry,
    );
  });

  return conversations.sort(
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
