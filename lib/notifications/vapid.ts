import "server-only";
import webpush from "web-push";

let configured = false;

export function getVapidPublicKey(): string | null {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  return key && key.length > 20 ? key : null;
}

function getVapidPrivateKey(): string | null {
  const key = process.env.VAPID_PRIVATE_KEY?.trim();
  return key && key.length > 10 ? key : null;
}

function getVapidSubject(): string {
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (subject) return subject;
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) {
    try {
      return `mailto:soporte@${new URL(site).hostname}`;
    } catch {
      /* fall through */
    }
  }
  return "mailto:alcentimo.app@gmail.com";
}

/** Configura web-push una sola vez. Devuelve false si faltan claves. */
export function ensureWebPushConfigured(): boolean {
  if (configured) return true;
  const publicKey = getVapidPublicKey();
  const privateKey = getVapidPrivateKey();
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(getVapidSubject(), publicKey, privateKey);
  configured = true;
  return true;
}
