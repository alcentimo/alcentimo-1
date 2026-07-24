import { formatUsd } from "@/lib/format";
import type { CartItem } from "@/lib/catalog/cart-types";
import type { CatalogFulfillmentMode } from "@/components/catalog-transactional/CatalogFulfillmentProvider";

export interface BuildCartWhatsAppMessageInput {
  storeName: string;
  items: CartItem[];
  subtotalUsd: number;
  totalUsd?: number;
  discountUsd?: number;
  promotionLabel?: string;
  customerName?: string;
  fulfillmentMode?: CatalogFulfillmentMode;
  locationName?: string | null;
  locationAddress?: string | null;
  deliveryAddress?: string | null;
  shippingLabel?: string;
  paymentLabel?: string;
}

function formatFulfillmentLabel(mode?: CatalogFulfillmentMode): string | null {
  if (mode === "pickup") return "Retiro en tienda";
  if (mode === "delivery") return "Envío a domicilio";
  return null;
}

/** Mensaje estructurado para consultar o confirmar un carrito por WhatsApp. */
export function buildCartWhatsAppMessage(
  input: BuildCartWhatsAppMessageInput,
): string {
  const productLines = input.items.map((item) => {
    const lineTotal = item.unitPriceUsd * item.quantity;
    const variantSuffix =
      item.variantName !== "Estándar" ? ` (${item.variantName})` : "";
    return `• ${item.quantity}x ${item.product.product_name}${variantSuffix} — ${formatUsd(lineTotal)}`;
  });

  const lines = [
    `Hola, quiero hacer un pedido en ${input.storeName}:`,
    "",
  ];

  if (input.customerName?.trim()) {
    lines.push(`👤 ${input.customerName.trim()}`, "");
  }

  lines.push("📋 Productos:", ...productLines, "");

  if (input.discountUsd && input.discountUsd > 0) {
    lines.push(`Subtotal: ${formatUsd(input.subtotalUsd)}`);
    lines.push(
      `Descuento${input.promotionLabel ? ` (${input.promotionLabel})` : ""}: -${formatUsd(input.discountUsd)}`,
    );
  }

  lines.push(`💰 Total: ${formatUsd(input.totalUsd ?? input.subtotalUsd)}`);

  const fulfillment = formatFulfillmentLabel(input.fulfillmentMode);
  if (fulfillment) {
    lines.push(`🚚 Modalidad: ${fulfillment}`);
  }

  if (input.locationName?.trim()) {
    lines.push(`📍 Sucursal: ${input.locationName.trim()}`);
    if (input.locationAddress?.trim()) {
      lines.push(`   ${input.locationAddress.trim()}`);
    }
  }

  if (input.deliveryAddress?.trim() && input.fulfillmentMode === "delivery") {
    lines.push(`🏠 Dirección de entrega: ${input.deliveryAddress.trim()}`);
  }

  if (input.shippingLabel?.trim()) {
    lines.push(`Envío: ${input.shippingLabel.trim()}`);
  }

  if (input.paymentLabel?.trim()) {
    lines.push(`Pago: ${input.paymentLabel.trim()}`);
  }

  lines.push("", "¿Me confirmas disponibilidad y datos de pago?");

  return lines.join("\n");
}
