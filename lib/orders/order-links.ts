import { getSiteUrl } from "@/lib/site-url";

const DEFAULT_PLATFORM_ORIGIN = "https://alcentimo.com";

/** URL pública para ver y gestionar un pedido desde la app. */
export function getPublicOrderDetailUrl(orderId: string): string {
  const base = getSiteUrl().replace(/\/$/, "");
  const safeBase = /supabase/i.test(base) ? DEFAULT_PLATFORM_ORIGIN : base;
  return `${safeBase}/pedidos/${orderId}`;
}

/**
 * URL usada en mensajes de WhatsApp: siempre alcentimo.com,
 * nunca Storage, localhost ni dominios de preview.
 */
export function getWhatsAppOrderDetailUrl(orderId: string): string {
  const trimmedId = orderId.trim();
  return `https://alcentimo.com/pedidos/${trimmedId}`;
}
