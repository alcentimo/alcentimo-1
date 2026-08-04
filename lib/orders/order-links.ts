import { getSiteUrl } from "@/lib/site-url";

const DEFAULT_PLATFORM_ORIGIN = "https://alcentimo.com";

/** URL pública para ver y gestionar un pedido desde la app. */
export function getPublicOrderDetailUrl(orderId: string): string {
  const base = getSiteUrl().replace(/\/$/, "");
  const safeBase = /supabase/i.test(base) ? DEFAULT_PLATFORM_ORIGIN : base;
  return `${safeBase}/pedidos/${orderId}`;
}
