export type InboxProvider =
  | "whatsapp"
  | "messenger"
  | "instagram"
  | "mercadolibre";

export type InboxConversationStatus = "open" | "pending" | "closed";

export type InboxMessageDirection = "inbound" | "outbound";

export type InboxMessageStatus =
  | "received"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export type InboxMessageType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "document"
  | "location"
  | "sticker"
  | "template"
  | "unknown";

export interface ChannelIntegration {
  id: string;
  store_id: string;
  provider: InboxProvider;
  external_account_id: string;
  display_name: string | null;
  config: Record<string, unknown>;
  webhook_verify_token: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ChannelMessageDirection = "inbound" | "outbound";

export type ChannelMessageStatus = "read" | "unread";

export interface ChannelMessage {
  id: string;
  integration_id: string;
  sender_id: string;
  message_text: string | null;
  direction: ChannelMessageDirection;
  status: ChannelMessageStatus;
  /** Estado de entrega Meta para mensajes salientes. */
  deliveryStatus?: InboxMessageStatus;
  created_at: string;
}

export interface InboxContact {
  id: string;
  store_id: string;
  provider: InboxProvider;
  external_id: string;
  display_name: string | null;
  phone_e164: string | null;
  avatar_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface InboxConversation {
  id: string;
  store_id: string;
  integration_id: string | null;
  contact_id: string;
  provider: InboxProvider;
  external_thread_id: string | null;
  status: InboxConversationStatus;
  subject: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
  assigned_to: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface InboxMessage {
  id: string;
  store_id: string;
  conversation_id: string;
  direction: InboxMessageDirection;
  sender_type: "customer" | "agent" | "system";
  sender_user_id: string | null;
  body: string | null;
  message_type: InboxMessageType;
  external_message_id: string | null;
  status: InboxMessageStatus;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
}
