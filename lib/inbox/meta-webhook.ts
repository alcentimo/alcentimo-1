import { createHmac, timingSafeEqual } from "node:crypto";

/** Verifica X-Hub-Signature-256 de Meta (WhatsApp / Messenger / Instagram). */
export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  const received = signatureHeader.slice("sha256=".length);

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
