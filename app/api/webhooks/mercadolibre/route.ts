import { NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildInboundMessageFromNotification,
  isSupportedMlTopic,
  parseMlNotifications,
} from "@/lib/inbox/mercadolibre-webhook";
import { resolveMlIntegration } from "@/lib/mercadolibre";

export const runtime = "nodejs";
export const maxDuration = 30;

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Webhook MercadoLibre: preguntas y ventas.
 *
 * Developer Portal → tu app → Notificaciones:
 * - Callback URL: https://alcentimo.com/api/webhooks/mercadolibre
 * - Topics: questions, orders (o created_orders para reserva de stock)
 */
export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const notifications = parseMlNotifications(payload);

  after(async () => {
    try {
      await ingestMlNotifications(notifications);
    } catch (err) {
      console.error("[webhooks/mercadolibre] ingest error:", err);
    }
  });

  // ML reintenta si no recibe HTTP 200 en ~20s; respondemos de inmediato.
  return NextResponse.json({ ok: true });
}

async function ingestMlNotifications(
  notifications: ReturnType<typeof parseMlNotifications>,
): Promise<void> {
  const admin = createAdminClient();

  for (const notification of notifications) {
    if (!isSupportedMlTopic(notification.topic)) continue;

    const integration = await resolveMlIntegration({
      externalAccountId: String(notification.user_id),
    });

    if (!integration) {
      console.warn(
        "[webhooks/mercadolibre] integration not found for user_id:",
        notification.user_id,
      );
      continue;
    }

    const inbound = await buildInboundMessageFromNotification(notification, {
      externalAccountId: String(notification.user_id),
    });

    if (!inbound) continue;

    await insertInboundMessage(admin, {
      integrationId: integration.id,
      storeId: integration.store_id,
      senderId: inbound.senderId,
      messageText: inbound.messageText,
    });
  }
}

async function insertInboundMessage(
  admin: AdminClient,
  input: {
    integrationId: string;
    storeId: string;
    senderId: string;
    messageText: string;
  },
): Promise<void> {
  const { error } = await admin.from("channel_messages").insert({
    integration_id: input.integrationId,
    sender_id: input.senderId,
    message_text: input.messageText,
    direction: "inbound",
    status: "unread",
  });

  if (error) {
    console.error("[webhooks/mercadolibre] insert failed:", {
      storeId: input.storeId,
      integrationId: input.integrationId,
      senderId: input.senderId,
      error,
    });
    throw error;
  }
}
