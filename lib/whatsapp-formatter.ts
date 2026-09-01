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
  /** Método de envío (ej. MRW, Retiro, Envío a domicilio). */
  shippingLabel?: string;
  /**
   * Modalidad de cobro del envío (ej. Cobro a destino, Gratis, $3.00).
   * Se muestra entre paréntesis junto al método.
   */
  shippingChargeLabel?: string;
  discountUsd?: number;
  promotionLabel?: string;
  giftCardUsd?: number;
  giftCardCode?: string;
  storeCreditUsd?: number;
  locationName?: string;
  locationAddress?: string;
  deliveryAddress?: string;
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

function buildTotalLine(totalUsd: number, totalBsLabel?: string): string {
  const usd = formatUsd(totalUsd);
  const bs = totalBsLabel?.trim();
  if (!bs) return `💰 Total: ${usd}`;
  return `💰 Total: ${usd} (${sanitizeCustomerText(bs)})`;
}

function buildShippingLine(
  method?: string,
  chargeLabel?: string,
): string | null {
  const methodClean = method?.trim() ? sanitizeCustomerText(method) : "";
  const chargeClean = chargeLabel?.trim()
    ? sanitizeCustomerText(chargeLabel)
    : "";
  if (!methodClean && !chargeClean) return null;
  if (methodClean && chargeClean && chargeClean !== "—") {
    return `🚚 Envío: ${methodClean} (${chargeClean})`;
  }
  if (methodClean) return `🚚 Envío: ${methodClean}`;
  return `🚚 Envío: ${chargeClean}`;
}

function buildSucursalLine(input: {
  shippingBranchName?: string;
  shippingBranchAddress?: string;
  locationName?: string;
  locationAddress?: string;
}): string | null {
  const branchName = input.shippingBranchName?.trim()
    ? sanitizeCustomerText(input.shippingBranchName)
    : "";
  const branchAddress = input.shippingBranchAddress?.trim()
    ? sanitizeCustomerText(input.shippingBranchAddress)
    : "";
  const locationName = input.locationName?.trim()
    ? sanitizeCustomerText(input.locationName)
    : "";
  const locationAddress = input.locationAddress?.trim()
    ? sanitizeCustomerText(input.locationAddress)
    : "";

  if (branchName || branchAddress) {
    const parts = [branchName, branchAddress].filter(Boolean);
    return `📍 Sucursal: ${parts.join(" · ")}`;
  }

  if (locationName || locationAddress) {
    const parts = [locationName, locationAddress].filter(Boolean);
    return `📍 Sucursal: ${parts.join(" · ")}`;
  }

  return null;
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

  body.push("📋 Productos:", ...productLines);

  if (
    input.discountUsd != null &&
    input.discountUsd > 0
  ) {
    body.push(
      `🏷️ Descuento${input.promotionLabel ? ` (${sanitizeCustomerText(input.promotionLabel)})` : ""}: -${formatUsd(input.discountUsd)}`,
    );
  }

  if (input.giftCardUsd != null && input.giftCardUsd > 0) {
    body.push(
      `🎁 Tarjeta de regalo${input.giftCardCode ? ` (${sanitizeCustomerText(input.giftCardCode)})` : ""}: -${formatUsd(input.giftCardUsd)}`,
    );
  }

  if (input.storeCreditUsd != null && input.storeCreditUsd > 0) {
    body.push(
      `🎁 Saldo a favor: -${formatUsd(input.storeCreditUsd)}`,
    );
  }

  body.push(buildTotalLine(input.totalUsd, input.totalBsLabel));

  body.push(
    "👤 Datos del cliente:",
    `Nombre: ${sanitizeCustomerText(input.customerName)}`,
  );
  if (input.customerPhone?.trim()) {
    body.push(`Teléfono: ${sanitizeCustomerText(input.customerPhone)}`);
  }

  const shippingLine = buildShippingLine(
    input.shippingLabel,
    input.shippingChargeLabel,
  );
  if (shippingLine) {
    body.push(shippingLine);
  }

  const sucursalLine = buildSucursalLine(input);
  if (sucursalLine) {
    body.push(sucursalLine);
  }

  if (input.deliveryAddress?.trim()) {
    body.push(`🏠 Entrega: ${sanitizeCustomerText(input.deliveryAddress)}`);
  }

  if (input.paymentLabel?.trim()) {
    body.push(`💳 Pago: ${sanitizeCustomerText(input.paymentLabel)}`);
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
