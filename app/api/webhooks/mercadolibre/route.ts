import { NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestInboundMessage } from "@/lib/inbox/ingest-inbound-message";
import {
  buildInboundMessageFromNotification,
  isSupportedMlTopic,
  parseMlNotifications,
} from "@/lib/inbox/mercadolibre-webhook";
import { resolveMlIntegration } from "@/lib/mercadolibre";

export const runtime = "nodejs";
export const maxDuration = 30;

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

    await ingestInboundMessage(admin, {
      storeId: integration.store_id,
      integrationId: integration.id,
      provider: "mercadolibre",
      senderId: inbound.senderId,
      platformMessageId: inbound.platformMessageId,
      body: inbound.messageText,
      messageType: "text",
      sentAt: inbound.sentAt,
      rawPayload: notification as unknown as Record<string, unknown>,
    });
  }
}
