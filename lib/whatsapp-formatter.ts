import { formatApproxBs, formatUsd } from "@/lib/format";

export interface TransactionalOrderWhatsAppItem {
  product_name: string;
  variant_name: string;
  quantity: number;
  line_total_usd: number;
  pricing_tier?: "retail" | "wholesale";
}

export interface TransactionalOrderWhatsAppMessageInput {
  customerName: string;
  customerPhone?: string;
  items: TransactionalOrderWhatsAppItem[];
  totalUsd: number;
  /** Equivalente en Bs (texto ya formateado, ej. ≈ 1.234,56 Bs). */
  totalBsLabel?: string;
  /** Referencia corta del pedido (ej. B67E238D). */
  orderRef?: string;
  /**
   * URL corta de previsualización (ej. https://todoropa.alcentimo.com/o/B67E238D).
   * Debe ser limpia; no usar UUID completo.
   */
  orderShareUrl?: string;
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

function formatOrderRef(raw?: string): string | null {
  const cleaned = raw?.trim().replace(/^#/, "") ?? "";
  if (!cleaned) return null;
  return cleaned.slice(0, 8).toUpperCase();
}

/**
 * Mensaje de pedido para WhatsApp (cliente → tienda).
 * Incluye referencia corta y, si existe, una URL limpia para la tarjeta OG.
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
    return `• ${item.quantity}x ${sanitizeCustomerText(productName)}${tierLabel} - ${formatUsd(item.line_total_usd)}`;
  });

  const orderRef = formatOrderRef(input.orderRef);

  const body: string[] = ["📦 Nuevo Pedido"];

  if (orderRef) {
    body.push(`🔖 Ref: #${orderRef}`);
  }

  body.push("", "📋 Productos:", ...productLines, "");

  const hasDiscount =
    input.discountUsd != null &&
    input.discountUsd > 0 &&
    input.subtotalUsd != null;
  const hasShippingLine = Boolean(
    input.shippingChargeLabel?.trim() ||
      (input.shippingCostUsd != null && input.shippingCostUsd > 0),
  );
  const merchandiseSubtotal =
    input.subtotalUsd != null && Number.isFinite(input.subtotalUsd)
      ? input.subtotalUsd
      : input.items.reduce((sum, item) => sum + item.line_total_usd, 0);
  const showSubtotalBreakdown =
    input.items.length > 1 ||
    hasDiscount ||
    hasShippingLine ||
    merchandiseSubtotal !== input.totalUsd;

  if (showSubtotalBreakdown) {
    body.push(`💰 Subtotal: ${formatUsd(merchandiseSubtotal)}`);
  }

  if (hasDiscount && input.subtotalUsd != null) {
    body.push(
      `🏷️ Descuento${input.promotionLabel ? ` (${sanitizeCustomerText(input.promotionLabel)})` : ""}: -${formatUsd(input.discountUsd!)}`,
    );
  }

  if (input.shippingChargeLabel?.trim()) {
    body.push(
      `🚚 Costo de envío: ${sanitizeCustomerText(input.shippingChargeLabel)}`,
    );
  } else if (input.shippingCostUsd != null && input.shippingCostUsd > 0) {
    body.push(`🚚 Costo de envío: ${formatUsd(input.shippingCostUsd)}`);
  }

  body.push(`💰 Total: ${formatUsd(input.totalUsd)}`);
  if (input.totalBsLabel?.trim()) {
    body.push(`🇻🇪 Total Bs: ${sanitizeCustomerText(input.totalBsLabel)}`);
  }

  body.push(
    "",
    "👤 Datos del cliente:",
    `Nombre: ${sanitizeCustomerText(input.customerName)}`,
  );
  if (input.customerPhone?.trim()) {
    body.push(`Teléfono: ${sanitizeCustomerText(input.customerPhone)}`);
  }

  if (input.shippingLabel?.trim()) {
    body.push("", `🚚 Envío: ${sanitizeCustomerText(input.shippingLabel)}`);
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

  if (input.paymentLabel?.trim()) {
    body.push("", `💳 Pago: ${sanitizeCustomerText(input.paymentLabel)}`);
  }

  const messageBody = stripStorageUrls(body.join("\n"));
  const shareUrl = input.orderShareUrl?.trim() ?? "";

  // URL corta de la tienda (/o/CODIGO). Rechaza Storage y UUID largos en la ruta.
  if (
    !shareUrl ||
    /supabase\.co/i.test(shareUrl) ||
    /\/pedidos\//i.test(shareUrl) ||
    /\/o\/[0-9a-f]{8}-[0-9a-f-]{27,}/i.test(shareUrl)
  ) {
    return messageBody;
  }

  return `${messageBody}\n\n${shareUrl}`;
}

/** Helper para armar la línea de Bs a partir de tasa y total USD. */
export function buildOrderTotalBsLabel(
  totalUsd: number,
  exchangeRate: number | null | undefined,
): string | undefined {
  if (
    typeof exchangeRate !== "number" ||
    !Number.isFinite(exchangeRate) ||
    exchangeRate <= 0 ||
    !Number.isFinite(totalUsd)
  ) {
    return undefined;
  }
  return formatApproxBs(totalUsd * exchangeRate);
}
