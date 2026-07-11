import { NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  extractWhatsAppMessageText,
  parseMetaVerifyQuery,
  verifyMetaWebhookSignature,
} from "@/lib/inbox/meta-webhook";

export const runtime = "nodejs";
export const maxDuration = 30;

type AdminClient = ReturnType<typeof createAdminClient>;

type ChannelIntegration = {
  id: string;
  store_id: string;
};

/**
 * Webhook unificado Meta: WhatsApp Cloud API + Messenger + Instagram.
 *
 * Meta Developer Console:
 * - Callback URL: https://alcentimo.com/api/webhooks/meta
 * - Verify token: META_WEBHOOK_VERIFY_TOKEN (env) o channel_integrations.webhook_verify_token
 * - Suscripciones: messages (WhatsApp), messaging (Page / Instagram)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { mode, token, challenge } = parseMetaVerifyQuery(searchParams);

  if (mode !== "subscribe" || !token || !challenge) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isValid = await isVerifyTokenAccepted(token);
  if (!isValid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Meta exige devolver hub.challenge en texto plano para validar la URL.
  return new NextResponse(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

export async function POST(request: Request) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    return NextResponse.json(
      { error: "META_APP_SECRET not configured" },
      { status: 500 },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyMetaWebhookSignature(rawBody, signature, appSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  after(async () => {
    try {
      await ingestMetaWebhookPayload(payload);
    } catch (err) {
      console.error("[webhooks/meta] ingest error:", err);
    }
  });

  // Meta reintenta si no recibe 200 rápido; respondemos de inmediato.
  return NextResponse.json({ ok: true });
}

/** Acepta token global (env) o token por tienda en channel_integrations. */
async function isVerifyTokenAccepted(token: string): Promise<boolean> {
  const envToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (envToken && token === envToken) return true;

  const admin = createAdminClient();
  const { data } = await admin
    .from("channel_integrations")
    .select("id")
    .eq("webhook_verify_token", token)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}

async function findIntegration(
  admin: AdminClient,
  provider: "whatsapp" | "messenger" | "instagram",
  externalAccountId: string,
): Promise<ChannelIntegration | null> {
  if (!externalAccountId) return null;

  const { data, error } = await admin
    .from("channel_integrations")
    .select("id, store_id")
    .eq("provider", provider)
    .eq("external_account_id", externalAccountId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[webhooks/meta] integration lookup error:", error);
    return null;
  }

  return data;
}

async function ingestMetaWebhookPayload(payload: unknown): Promise<void> {
  if (!payload || typeof payload !== "object") return;

  const object = (payload as { object?: string }).object;
  const entries = (payload as { entry?: unknown[] }).entry ?? [];
  const admin = createAdminClient();

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;

    if (object === "whatsapp_business_account") {
      await ingestWhatsAppEntry(admin, entry as Record<string, unknown>);
      continue;
    }

    if (object === "page" || object === "instagram") {
      await ingestMessagingEntry(
        admin,
        entry as Record<string, unknown>,
        object,
      );
    }
  }
}

async function ingestWhatsAppEntry(
  admin: AdminClient,
  entry: Record<string, unknown>,
): Promise<void> {
  const changes = (entry.changes as unknown[]) ?? [];

  for (const change of changes) {
    if (!change || typeof change !== "object") continue;

    const value = (change as { value?: Record<string, unknown> }).value;
    if (!value) continue;

    const metadata = value.metadata as { phone_number_id?: string } | undefined;
    const phoneNumberId = String(metadata?.phone_number_id ?? "");
    const messages = (value.messages as unknown[]) ?? [];

    if (!phoneNumberId || messages.length === 0) continue;

    const integration = await findIntegration(
      admin,
      "whatsapp",
      phoneNumberId,
    );

    if (!integration) {
      console.warn(
        "[webhooks/meta] WhatsApp integration not found for phone_number_id:",
        phoneNumberId,
      );
      continue;
    }

    for (const msg of messages) {
      if (!msg || typeof msg !== "object") continue;

      const m = msg as Record<string, unknown>;
      const senderId = String(m.from ?? "");
      const messageText = extractWhatsAppMessageText(m);

      if (!senderId) continue;

      await insertInboundMessage(admin, {
        integrationId: integration.id,
        storeId: integration.store_id,
        senderId,
        messageText,
      });
    }
  }
}

async function ingestMessagingEntry(
  admin: AdminClient,
  entry: Record<string, unknown>,
  object: string,
): Promise<void> {
  const provider = object === "instagram" ? "instagram" : "messenger";
  const pageId = String(entry.id ?? "");
  const messagingEvents = (entry.messaging as unknown[]) ?? [];

  const integration = await findIntegration(admin, provider, pageId);
  if (!integration) {
    console.warn(
      `[webhooks/meta] ${provider} integration not found for page id:`,
      pageId,
    );
    return;
  }

  for (const event of messagingEvents) {
    if (!event || typeof event !== "object") continue;

    const e = event as Record<string, unknown>;
    const message = e.message as Record<string, unknown> | undefined;
    if (!message) continue;

    const senderId = String((e.sender as { id?: string })?.id ?? "");
    const messageText =
      typeof message.text === "string" ? message.text : null;

    if (!senderId) continue;

    await insertInboundMessage(admin, {
      integrationId: integration.id,
      storeId: integration.store_id,
      senderId,
      messageText,
    });
  }
}

async function insertInboundMessage(
  admin: AdminClient,
  input: {
    integrationId: string;
    storeId: string;
    senderId: string;
    messageText: string | null;
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
    console.error("[webhooks/meta] insert failed:", {
      storeId: input.storeId,
      integrationId: input.integrationId,
      senderId: input.senderId,
      error,
    });
    throw error;
  }
}
