import type { CatalogOrder } from "@/lib/orders/types";
import { AI_MAX_INPUT_CHARS } from "@/lib/ai/token-limits";
import { formatUsd } from "@/lib/format";
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
      return `• ${item.quantity}x ${item.product_name}${variant} - ${formatUsd(item.line_total_usd)}`;
    })
    .join("\n");
}

export function formatOrderProductSummary(
  order: CatalogOrder,
  maxItems = AI_MAX_INPUT_CHARS.orderProducts,
): string {
  const items = order.items.slice(0, maxItems).map((item) => {
    const variant =
      item.variant_name !== "Estándar" ? ` ${item.variant_name}` : "";
    return `${item.quantity}x ${item.product_name}${variant} (${formatUsd(item.line_total_usd)})`;
  });

  if (order.items.length > maxItems) {
    items.push(`+${order.items.length - maxItems} más`);
  }

  return items.join("; ");
}

export function renderMessageTemplate(
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

  return renderMessageTemplate(template, {
    cliente: order.customer_name,
    tienda: storeName,
    total: formatUsd(order.total_usd),
    referencia: order.id.slice(0, 8).toUpperCase(),
    productos: formatProductSummary(order),
  });
}
