import { createHmac, timingSafeEqual } from "node:crypto";

/** Verifica X-Hub-Signature-256 de Meta (WhatsApp Cloud API). */
export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  const received = signatureHeader.slice("sha256=".length).trim();

  if (expected.length !== received.length) return false;

  try {
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(received, "hex"),
    );
  } catch {
    return false;
  }
}

export function parseMetaVerifyQuery(searchParams: URLSearchParams): {
  mode: string | null;
  token: string | null;
  challenge: string | null;
} {
  return {
    mode: searchParams.get("hub.mode"),
    token: searchParams.get("hub.verify_token"),
    challenge: searchParams.get("hub.challenge"),
  };
}

/** Extrae texto legible de un mensaje entrante de WhatsApp Cloud API. */
export function extractWhatsAppMessageText(
  message: Record<string, unknown>,
): string | null {
  const textBody = (message.text as { body?: string } | undefined)?.body;
  if (typeof textBody === "string") return textBody;

  const buttonText = (message.button as { text?: string } | undefined)?.text;
  if (typeof buttonText === "string") return buttonText;

  const interactive = message.interactive as
    | {
        button_reply?: { title?: string };
        list_reply?: { title?: string };
      }
    | undefined;

  const replyTitle =
    interactive?.button_reply?.title ?? interactive?.list_reply?.title;
  if (typeof replyTitle === "string") return replyTitle;

  const caption = (message.image as { caption?: string } | undefined)?.caption;
  if (typeof caption === "string") return caption;

  return null;
}

const WHATSAPP_MEDIA_TYPES = new Set([
  "image",
  "audio",
  "video",
  "document",
  "sticker",
  "location",
]);

/** Tipo de mensaje WhatsApp Cloud API → inbox message_type. */
export function resolveWhatsAppMessageType(
  type: unknown,
): "text" | "image" | "audio" | "video" | "document" | "sticker" | "location" | "unknown" {
  if (typeof type !== "string") return "unknown";
  if (type === "text" || type === "button" || type === "interactive") return "text";
  if (WHATSAPP_MEDIA_TYPES.has(type)) {
    return type as "image" | "audio" | "video" | "document" | "sticker" | "location";
  }
  return "unknown";
}

/** Convierte timestamp Unix (segundos) de Meta a ISO. */
export function metaTimestampToIso(timestamp: unknown): string | undefined {
  const value = typeof timestamp === "string" ? Number(timestamp) : timestamp;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return new Date(value * 1000).toISOString();
}

export type MetaInboundMessagePreview = {
  channel: "whatsapp";
  senderId: string;
  messageText: string | null;
};

/** Extrae sender.id y message.text del payload sin I/O (para ack rápido a Meta). */
export function extractMetaInboundMessages(
  payload: unknown,
): MetaInboundMessagePreview[] {
  if (!payload || typeof payload !== "object") return [];

  const object = (payload as { object?: string }).object;
  if (object !== "whatsapp_business_account") return [];

  const entries = (payload as { entry?: unknown[] }).entry ?? [];
  const results: MetaInboundMessagePreview[] = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const entryRecord = entry as Record<string, unknown>;

    for (const change of (entryRecord.changes as unknown[]) ?? []) {
      if (!change || typeof change !== "object") continue;
      const changeRecord = change as Record<string, unknown>;
      if (changeRecord.field && changeRecord.field !== "messages") continue;

      const value = changeRecord.value as Record<string, unknown> | undefined;
      if (!value) continue;

      for (const msg of (value.messages as unknown[]) ?? []) {
        if (!msg || typeof msg !== "object") continue;
        const message = msg as Record<string, unknown>;
        const senderId = String(message.from ?? "");
        if (!senderId) continue;

        results.push({
          channel: "whatsapp",
          senderId,
          messageText: extractWhatsAppMessageText(message),
        });
      }
    }
  }

  return results;
}
