import { formatUsd } from "@/lib/format";

export interface TransactionalOrderWhatsAppItem {
  product_name: string;
  variant_name: string;
  quantity: number;
  line_total_usd: number;
}

export interface TransactionalOrderWhatsAppMessageInput {
  customerName: string;
  items: TransactionalOrderWhatsAppItem[];
  totalUsd: number;
  orderDetailUrl: string;
}

/**
 * Mensaje de notificación de pedido para WhatsApp.
 * No incluye URLs de Storage (evita previsualización de imagen en el chat).
 */
export function buildTransactionalOrderWhatsAppMessage(
  input: TransactionalOrderWhatsAppMessageInput,
): string {
  const productLines = input.items.map((item) => {
    const productName =
      item.variant_name !== "Estándar"
        ? `${item.product_name} (${item.variant_name})`
        : item.product_name;
    return `• ${item.quantity} x ${productName} - ${formatUsd(item.line_total_usd)}`;
  });

  const orderUrl = input.orderDetailUrl.trim();

  const lines = [
    "📦 Nuevo Pedido",
    "",
    `👤 Cliente: ${input.customerName}`,
    "",
    "📋 Productos:",
    ...productLines,
    "",
    `💰 Total: ${formatUsd(input.totalUsd)}`,
  ];

  if (!orderUrl) return lines.join("\n");

  return `${lines.join("\n")}\n\n🖼️ Ver comprobante y gestionar pedido:\n${orderUrl}`;
}
