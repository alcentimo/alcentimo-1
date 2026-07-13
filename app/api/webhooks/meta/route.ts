import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestInboundMessage } from "@/lib/inbox/ingest-inbound-message";
import {
  extractMetaInboundMessages,
  extractWhatsAppMessageText,
  metaTimestampToIso,
  parseMetaVerifyQuery,
  resolveWhatsAppMessageType,
  verifyMetaWebhookSignature,
} from "@/lib/inbox/meta-webhook";
import type { InboxProvider } from "@/lib/inbox/types";

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
 * - Callback URL: https://www.alcentimo.com/api/webhooks/meta
 * - Verify token: VERIFY_TOKEN (env) — alias: META_WEBHOOK_VERIFY_TOKEN
 * - App secret: APP_SECRET (env) — alias: META_APP_SECRET
 * - Suscripciones: messages (WhatsApp), messaging (Page / Instagram)
 */
function getWebhookVerifyToken(): string | undefined {
  return (
    process.env.VERIFY_TOKEN?.trim() ??
    process.env.META_WEBHOOK_VERIFY_TOKEN?.trim()
  );
}

/** App Secret de Meta para validar X-Hub-Signature-256 en POST. */
function getMetaAppSecret(): string | undefined {
  return (
    process.env.APP_SECRET?.trim() ??
    process.env.META_APP_SECRET?.trim()
  );
}

/** GET — verificación del webhook (hub.mode, hub.verify_token, hub.challenge). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { mode, token, challenge } = parseMetaVerifyQuery(searchParams);

  if (mode !== "subscribe" || !token || !challenge) {
    return new Response(null, { status: 403 });
  }

  const expectedToken = getWebhookVerifyToken();
  if (!expectedToken || token !== expectedToken) {
    return new Response(null, { status: 403 });
  }

  return new Response(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

/** POST — eventos entrantes (messages / messaging). */
export async function POST(request: Request) {
  const appSecret = getMetaAppSecret();
  if (!appSecret) {
    console.error(
      "[webhooks/meta] APP_SECRET / META_APP_SECRET no configurado en el servidor.",
    );
    return new Response(null, { status: 500 });
  }

  const rawBody = await request.text();
  const signature =
    request.headers.get("x-hub-signature-256") ??
    request.headers.get("X-Hub-Signature-256");

  if (!signature) {
    console.error("[webhooks/meta] Falta cabecera X-Hub-Signature-256.");
    return new Response(null, { status: 401 });
  }

  if (!verifyMetaWebhookSignature(rawBody, signature, appSecret)) {
    console.error(
      "[webhooks/meta] Firma inválida — revisa que APP_SECRET coincida con el App Secret de Meta.",
    );
    return new Response(null, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(null, { status: 400 });
  }

  const inboundMessages = extractMetaInboundMessages(payload);
  const payloadSummary = summarizeMetaPayload(payload);
  console.log("[webhooks/meta] payload recibido:", payloadSummary);

  if (inboundMessages.length === 0) {
    console.warn(
      "[webhooks/meta] Sin mensajes extraíbles del payload (¿delivery/read/postback?).",
      payloadSummary,
    );
  }

  for (const msg of inboundMessages) {
    console.log("[webhooks/meta] evento messages:", {
      channel: msg.channel,
      senderId: msg.senderId,
      messageText: msg.messageText,
    });
  }

  // Procesamiento pesado (Supabase) en background — no bloquea el 200 a Meta
  after(async () => {
    console.log("[webhooks/meta] ingest background iniciado");
    try {
      await ingestMetaWebhookPayload(payload);
      console.log("[webhooks/meta] ingest background completado");
    } catch (err) {
      console.error("[webhooks/meta] ingest error:", err);
    }
  });

  return new Response(null, { status: 200 });
}

function summarizeMetaPayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") {
    return { valid: false };
  }

  const record = payload as { object?: string; entry?: unknown[] };
  const entries = record.entry ?? [];

  return {
    object: record.object ?? null,
    entryCount: entries.length,
    entryIds: entries
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
      .map((entry) => String(entry.id ?? "")),
    messagingEventCount: entries.reduce((total, entry) => {
      if (!entry || typeof entry !== "object") return total;
      const messaging = (entry as { messaging?: unknown[] }).messaging ?? [];
      return total + messaging.length;
    }, 0),
    whatsappChangeCount: entries.reduce((total, entry) => {
      if (!entry || typeof entry !== "object") return total;
      const changes = (entry as { changes?: unknown[] }).changes ?? [];
      return total + changes.length;
    }, 0),
  };
}

async function findIntegration(
  admin: AdminClient,
  provider: InboxProvider,
  externalAccountId: string,
): Promise<ChannelIntegration | null> {
  if (!externalAccountId) return null;

  console.log("[webhooks/meta] buscando integración:", {
    provider,
    externalAccountId,
  });

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

  if (!data) {
    console.warn("[webhooks/meta] integración no encontrada:", {
      provider,
      externalAccountId,
    });
  } else {
    console.log("[webhooks/meta] integración encontrada:", data);
  }

  return data;
}

async function saveChannelMessage(
  admin: AdminClient,
  integrationId: string,
  senderId: string,
  messageText: string | null,
): Promise<void> {
  const { error } = await admin.from("channel_messages").insert({
    integration_id: integrationId,
    sender_id: senderId,
    message_text: messageText,
    direction: "inbound",
    status: "unread",
  });

  if (error) {
    console.error("[webhooks/meta] channel_messages insert failed:", error);
    throw error;
  }

  console.log("[webhooks/meta] channel_messages insert ok:", {
    integrationId,
    senderId,
    messageText,
  });
}

async function ingestMetaWebhookPayload(payload: unknown): Promise<void> {
  if (!payload || typeof payload !== "object") {
    console.warn("[webhooks/meta] payload inválido, ingest omitido");
    return;
  }

  const object = (payload as { object?: string }).object;
  const entries = (payload as { entry?: unknown[] }).entry ?? [];
  console.log("[webhooks/meta] ingest iniciado:", {
    object,
    entryCount: entries.length,
  });

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
      continue;
    }
  }

  if (
    object !== "whatsapp_business_account" &&
    object !== "page" &&
    object !== "instagram"
  ) {
    console.warn("[webhooks/meta] object no soportado:", object);
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

    const field = (change as { field?: string }).field;
    if (field && field !== "messages") continue;

    const metadata = value.metadata as { phone_number_id?: string } | undefined;
    const phoneNumberId = String(metadata?.phone_number_id ?? "");
    const messages = (value.messages as unknown[]) ?? [];
    const contacts = (value.contacts as Array<Record<string, unknown>>) ?? [];

    if (!phoneNumberId || messages.length === 0) {
      console.log("[webhooks/meta] WhatsApp change sin mensajes:", {
        phoneNumberId,
        messageCount: messages.length,
        field,
      });
      continue;
    }

    const integration = await findIntegration(admin, "whatsapp", phoneNumberId);
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
      const platformMessageId = String(m.id ?? "");
      if (!senderId || !platformMessageId) continue;

      const contactMeta = contacts.find(
        (item) => String(item.wa_id ?? "") === senderId,
      );
      const profileName =
        (contactMeta?.profile as { name?: string } | undefined)?.name ?? null;
      const body = extractWhatsAppMessageText(m);

      console.log("[webhooks/meta] mensaje WhatsApp:", {
        integrationId: integration.id,
        senderId,
        platformMessageId,
        body,
        raw: m,
      });

      await saveChannelMessage(admin, integration.id, senderId, body);

      await ingestInboundMessage(admin, {
        storeId: integration.store_id,
        integrationId: integration.id,
        provider: "whatsapp",
        senderId,
        platformMessageId,
        body,
        messageType: resolveWhatsAppMessageType(m.type),
        sentAt: metaTimestampToIso(m.timestamp),
        contactDisplayName: profileName,
        contactPhone: senderId,
        rawPayload: m,
      }).then((result) => {
        console.log("[webhooks/meta] inbox_messages ingest:", result);
      });
    }
  }
}

async function ingestMessagingEntry(
  admin: AdminClient,
  entry: Record<string, unknown>,
  object: string,
): Promise<void> {
  const provider: InboxProvider =
    object === "instagram" ? "instagram" : "messenger";
  const pageId = String(entry.id ?? "");
  const messagingEvents = (entry.messaging as unknown[]) ?? [];

  if (messagingEvents.length === 0) {
    console.log("[webhooks/meta] entry sin eventos messaging:", { provider, pageId });
  }

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
    if (!message) {
      console.log("[webhooks/meta] evento messaging sin message (delivery/read?):", e);
      continue;
    }

    const senderId = String((e.sender as { id?: string })?.id ?? "");
    const platformMessageId = String(message.mid ?? message.id ?? "");
    if (!senderId || !platformMessageId) continue;

    const body =
      typeof message.text === "string"
        ? message.text
        : typeof (message.attachments as unknown[])?.length === "number"
          ? "[Adjunto]"
          : null;

    console.log("[webhooks/meta] mensaje Messenger/Instagram:", {
      provider,
      integrationId: integration.id,
      senderId,
      platformMessageId,
      body,
      raw: e,
    });

    await saveChannelMessage(admin, integration.id, senderId, body);

    await ingestInboundMessage(admin, {
      storeId: integration.store_id,
      integrationId: integration.id,
      provider,
      senderId,
      platformMessageId,
      body,
      messageType: body ? "text" : "unknown",
      sentAt: metaTimestampToIso(e.timestamp),
      rawPayload: e,
    }).then((result) => {
      console.log("[webhooks/meta] inbox_messages ingest:", result);
    });
  }
}
