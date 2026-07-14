import { getSiteUrl } from "@/lib/site-url";

/** URL pública para ver y gestionar un pedido desde WhatsApp. */
export function getPublicOrderDetailUrl(orderId: string): string {
  const base = getSiteUrl();
  return `${base}/pedidos/${orderId}`;
}
