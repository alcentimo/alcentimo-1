import { formatUsd } from "@/lib/format";
import type { CatalogOrder } from "@/lib/orders/types";
import {
  resolveMessageTemplateKey,
  type OrderMessageTemplateKey,
} from "@/lib/orders/message-templates";
import type { MessageTemplatesSettings } from "@/lib/store-settings/types";

function formatProductSummary(order: CatalogOrder): string {
  return order.items
    .map((item) => {
      const variant =
        item.variant_name !== "Estándar" ? ` (${item.variant_name})` : "";
      return `• ${item.quantity}x ${item.product_name}${variant} — ${formatUsd(item.line_total_usd)}`;
    })
    .join("\n");
}

function applyPlaceholders(
  template: string,
  values: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result.replace(/\n{3,}/g, "\n\n").trim();
}

export function renderOrderWhatsAppMessage(
  order: CatalogOrder,
  templates: MessageTemplatesSettings,
  storeName: string,
  templateKey?: OrderMessageTemplateKey,
): string {
  const key = templateKey ?? resolveMessageTemplateKey(order.estado);
  const template = templates[key];

  return applyPlaceholders(template, {
    cliente: order.customer_name,
    tienda: storeName,
    total: formatUsd(order.total_usd),
    referencia: order.id.slice(0, 8).toUpperCase(),
    productos: formatProductSummary(order),
  });
}
