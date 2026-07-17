import { normalizeWhatsAppPhone } from "@/lib/catalog/whatsapp-order";
import { formatUsd } from "@/lib/format";

export function buildCustomerWhatsAppUrl(
  phone: string | null | undefined,
  context?: {
    customerName: string;
    orderId: string;
    totalUsd: number;
  },
  message?: string,
): string | null {
  const normalized = normalizeWhatsAppPhone(String(phone ?? ""));
  if (!normalized) return null;

  const body =
    message ??
    (context
      ? [
          `Hola ${context.customerName}, te escribo desde mi tienda en Alcentimo sobre tu pedido.`,
          `Total: ${formatUsd(context.totalUsd)}.`,
          `Referencia: ${context.orderId.slice(0, 8)}.`,
        ].join("\n")
      : undefined);

  if (!body) {
    return `https://wa.me/${normalized}`;
  }

  return `https://wa.me/${normalized}?text=${encodeURIComponent(body)}`;
}
