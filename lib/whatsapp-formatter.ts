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
  orderDetailUrl: string;
  paymentLabel?: string;
  shippingLabel?: string;
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

const PLATFORM_HOST_PATTERN = /(^|\.)alcentimo\.com$/i;

function stripStorageUrls(text: string): string {
  return text.replace(STORAGE_URL_PATTERN, "").replace(/\n{3,}/g, "\n\n").trim();
}

function isPlatformOrderUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    if (/supabase\.co|storage\/v1/i.test(parsed.href)) return false;
    return PLATFORM_HOST_PATTERN.test(parsed.hostname);
  } catch {
    return false;
  }
}

function sanitizeCustomerText(value: string): string {
  return stripStorageUrls(value).replace(/\s+/g, " ").trim();
}

/**
 * Mensaje de notificación de pedido para WhatsApp.
 * Solo incluye un enlace de la plataforma al final (sin URLs de Storage).
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
    body.push(`💰 Total: ${formatUsd(input.totalUsd)}`);
  } else {
    body.push(`💰 Total: ${formatUsd(input.totalUsd)}`);
  }

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

  const messageBody = body.join("\n");

  const orderUrl = stripStorageUrls(input.orderDetailUrl.trim());
  if (!orderUrl || !isPlatformOrderUrl(orderUrl)) {
    return stripStorageUrls(messageBody);
  }

  // Solo el enlace de la plataforma al final → una única vista previa con marca Alcentimo.
  return `${stripStorageUrls(messageBody)}\n\n${orderUrl}`;
}
