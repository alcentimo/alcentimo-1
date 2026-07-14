import { formatUsd } from "@/lib/format";
import type { CartItem } from "@/lib/catalog/cart-types";
import { buildTransactionalOrderWhatsAppMessage } from "@/lib/whatsapp-formatter";

export function normalizeWhatsAppPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;

  if (digits.startsWith("58") && digits.length >= 12) return digits;
  if (digits.startsWith("0")) return `58${digits.slice(1)}`;
  if (digits.length === 10) return `58${digits}`;

  return digits;
}

export function buildWhatsAppOrderUrl(phone: string, message: string): string | null {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function buildOrderWhatsAppMessage(options: {
  storeName: string;
  items: CartItem[];
  subtotalUsd: number;
  totalUsd: number;
  discountUsd?: number;
  couponCode?: string;
  paymentLabel: string;
  shippingLabel: string;
}): string {
  const productLines = options.items.map((item) => {
    const lineTotal = item.unitPriceUsd * item.quantity;
    const variantSuffix =
      item.variantName !== "Estándar" ? ` (${item.variantName})` : "";
    return `• ${item.quantity}x ${item.product.product_name}${variantSuffix} — ${formatUsd(lineTotal)}`;
  });

  const lines = [
    `Hola, quiero comprar en ${options.storeName}:`,
    "",
    ...productLines,
    "",
    `Subtotal: ${formatUsd(options.subtotalUsd)}`,
  ];

  if (options.couponCode && (options.discountUsd ?? 0) > 0) {
    lines.push(
      `Cupón ${options.couponCode}: -${formatUsd(options.discountUsd ?? 0)}`,
    );
  }

  lines.push(
    `Total: ${formatUsd(options.totalUsd)}`,
    `Método de pago: ${options.paymentLabel}`,
    `Envío: ${options.shippingLabel}`,
  );

  return lines.join("\n");
}

/** @deprecated Usar buildTransactionalOrderWhatsAppMessage en lib/whatsapp-formatter.ts */
export function buildTransactionalWhatsAppMessage(options: {
  storeName: string;
  customerName: string;
  items: Array<{
    product_name: string;
    variant_name: string;
    quantity: number;
    line_total_usd: number;
  }>;
  totalUsd: number;
  proofUrl: string;
}): string {
  return buildTransactionalOrderWhatsAppMessage({
    customerName: options.customerName,
    items: options.items,
    totalUsd: options.totalUsd,
    orderDetailUrl: options.proofUrl.trim(),
  });
}
