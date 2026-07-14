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
    return `• ${item.quantity} x ${sanitizeCustomerText(productName)} - ${formatUsd(item.line_total_usd)}`;
  });

  const body = [
    "📦 Nuevo Pedido",
    "",
    `👤 Cliente: ${sanitizeCustomerText(input.customerName)}`,
    "",
    "📋 Productos:",
    ...productLines,
    "",
    `💰 Total: ${formatUsd(input.totalUsd)}`,
  ].join("\n");

  const orderUrl = stripStorageUrls(input.orderDetailUrl.trim());
  if (!orderUrl || !isPlatformOrderUrl(orderUrl)) {
    return stripStorageUrls(body);
  }

  // Solo el enlace de la plataforma al final → una única vista previa con marca Alcentimo.
  return `${stripStorageUrls(body)}\n\n${orderUrl}`;
}
