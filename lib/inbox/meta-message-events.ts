import type { SupabaseClient } from "@supabase/supabase-js";
import type { InboxMessageStatus } from "@/lib/inbox/types";

function metaEventTimeToIso(value: unknown): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (typeof num !== "number" || !Number.isFinite(num)) {
    return new Date().toISOString();
  }

  const ms = num > 1_000_000_000_000 ? num : num * 1000;
  return new Date(ms).toISOString();
}

export async function applyMetaDeliveryEvent(
  admin: SupabaseClient,
  storeId: string,
  mids: string[],
  timestamp: unknown,
): Promise<void> {
  const deliveredAt = metaEventTimeToIso(timestamp);
  const normalizedMids = mids.map((mid) => mid.trim()).filter(Boolean);
  if (normalizedMids.length === 0) return;

  const { error } = await admin
    .from("inbox_messages")
    .update({
      status: "delivered" satisfies InboxMessageStatus,
      delivered_at: deliveredAt,
    })
    .eq("store_id", storeId)
    .eq("direction", "outbound")
    .in("external_message_id", normalizedMids)
    .in("status", ["sent", "delivered"]);

  if (error) {
    console.error("[meta-message-events] delivery update failed:", error);
  }
}

export async function applyMetaReadEvent(
  admin: SupabaseClient,
  storeId: string,
  integrationId: string,
  senderId: string,
  watermark: unknown,
): Promise<void> {
  if (!senderId.trim()) return;

  const readAt = metaEventTimeToIso(watermark);

  const { data: contact, error: contactError } = await admin
    .from("inbox_contacts")
    .select("id")
    .eq("store_id", storeId)
    .eq("external_id", senderId)
    .maybeSingle();

  if (contactError) {
    console.error("[meta-message-events] contact lookup failed:", contactError);
    return;
  }

  if (!contact?.id) return;

  const { data: conversation, error: conversationError } = await admin
    .from("inbox_conversations")
    .select("id")
    .eq("store_id", storeId)
    .eq("contact_id", contact.id)
    .eq("integration_id", integrationId)
    .maybeSingle();

  if (conversationError) {
    console.error(
      "[meta-message-events] conversation lookup failed:",
      conversationError,
    );
    return;
  }

  if (!conversation?.id) return;

  const { error } = await admin
    .from("inbox_messages")
    .update({
      status: "read" satisfies InboxMessageStatus,
      read_at: readAt,
      delivered_at: readAt,
    })
    .eq("conversation_id", conversation.id)
    .eq("direction", "outbound")
    .in("status", ["sent", "delivered", "read"])
    .lte("sent_at", readAt);

  if (error) {
    console.error("[meta-message-events] read update failed:", error);
  }
}
