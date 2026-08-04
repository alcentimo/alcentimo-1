import { formatUsd } from "@/lib/format";

export interface TransactionalOrderWhatsAppItem {
  product_name: string;
  variant_name: string;
  quantity: number;
  line_total_usd: number;
  pricing_tier?: "retail" | "wholesale";
}

export interface TransactionalOrderWhatsAppMessageInput {
  customerName: string;
  items: TransactionalOrderWhatsAppItem[];
  totalUsd: number;
  paymentLabel?: string;
  shippingLabel?: string;
  shippingCostUsd?: number;
  shippingChargeLabel?: string;
  subtotalUsd?: number;
  discountUsd?: number;
  promotionLabel?: string;
  locationName?: string;
  locationAddress?: string;
  deliveryAddress?: string;
  fulfillmentLabel?: string;
  shippingBranchName?: string;
  shippingBranchAddress?: string;
}

const STORAGE_URL_PATTERN =
  /https?:\/\/[^\s]*supabase\.co[^\s]*/gi;

function stripStorageUrls(text: string): string {
  return text.replace(STORAGE_URL_PATTERN, "").replace(/\n{3,}/g, "\n\n").trim();
}

function sanitizeCustomerText(value: string): string {
  return stripStorageUrls(value).replace(/\s+/g, " ").trim();
}

/**
 * Mensaje de pedido para WhatsApp (cliente → tienda).
 * Solo datos de la compra: sin URLs de la plataforma.
 */
export function buildTransactionalOrderWhatsAppMessage(
  input: TransactionalOrderWhatsAppMessageInput,
): string {
  const productLines = input.items.map((item) => {
    const productName =
      item.variant_name !== "Estándar"
        ? `${item.product_name} (${item.variant_name})`
        : item.product_name;
    const tierLabel =
      item.pricing_tier === "wholesale" ? " · mayor" : "";
    return `• ${item.quantity} x ${sanitizeCustomerText(productName)}${tierLabel} - ${formatUsd(item.line_total_usd)}`;
  });

  const body = [
    "📦 Nuevo Pedido",
    "",
    `👤 Cliente: ${sanitizeCustomerText(input.customerName)}`,
    "",
    "📋 Productos:",
    ...productLines,
    "",
  ];

  if (
    input.discountUsd != null &&
    input.discountUsd > 0 &&
    input.subtotalUsd != null
  ) {
    body.push(`💰 Subtotal: ${formatUsd(input.subtotalUsd)}`);
    body.push(
      `🏷️ Descuento${input.promotionLabel ? ` (${sanitizeCustomerText(input.promotionLabel)})` : ""}: -${formatUsd(input.discountUsd)}`,
    );
  } else if (input.subtotalUsd != null && input.subtotalUsd !== input.totalUsd) {
    body.push(`💰 Subtotal: ${formatUsd(input.subtotalUsd)}`);
  }

  if (input.shippingChargeLabel?.trim()) {
    body.push(
      `🚚 Costo de envío: ${sanitizeCustomerText(input.shippingChargeLabel)}`,
    );
  } else if (input.shippingCostUsd != null && input.shippingCostUsd > 0) {
    body.push(`🚚 Costo de envío: ${formatUsd(input.shippingCostUsd)}`);
  }

  body.push(`💰 Total: ${formatUsd(input.totalUsd)}`);

  if (input.paymentLabel?.trim()) {
    body.push("", `💳 Pago: ${sanitizeCustomerText(input.paymentLabel)}`);
  }

  if (input.shippingLabel?.trim()) {
    body.push(`🚚 Envío: ${sanitizeCustomerText(input.shippingLabel)}`);
  }

  if (input.shippingBranchName?.trim()) {
    body.push(`🏢 Sucursal destino: ${sanitizeCustomerText(input.shippingBranchName)}`);
    if (input.shippingBranchAddress?.trim()) {
      body.push(`   ${sanitizeCustomerText(input.shippingBranchAddress)}`);
    }
  }

  if (input.fulfillmentLabel?.trim()) {
    body.push(`📦 Modalidad: ${sanitizeCustomerText(input.fulfillmentLabel)}`);
  }

  if (input.locationName?.trim()) {
    body.push(`📍 Sucursal: ${sanitizeCustomerText(input.locationName)}`);
    if (input.locationAddress?.trim()) {
      body.push(`   ${sanitizeCustomerText(input.locationAddress)}`);
    }
  }

  if (input.deliveryAddress?.trim()) {
    body.push(`🏠 Entrega: ${sanitizeCustomerText(input.deliveryAddress)}`);
  }

  return stripStorageUrls(body.join("\n"));
}
