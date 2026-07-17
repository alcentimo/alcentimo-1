import type { OrderEstado } from "@/lib/orders/order-status";
import type {
  MessageTemplatesSettings,
  OrderMessageTemplateKey,
} from "@/lib/store-settings/types";

export type { OrderMessageTemplateKey };

export const ORDER_MESSAGE_TEMPLATE_KEYS: OrderMessageTemplateKey[] = [
  "nuevo",
  "confirmado",
  "enviado",
];

export const ORDER_MESSAGE_TEMPLATE_LABELS: Record<
  OrderMessageTemplateKey,
  string
> = {
  nuevo: "Nuevo pedido",
  confirmado: "Pedido confirmado",
  enviado: "Pedido enviado",
};

export const MESSAGE_TEMPLATE_PLACEHOLDERS = [
  "{{cliente}}",
  "{{tienda}}",
  "{{total}}",
  "{{referencia}}",
  "{{productos}}",
] as const;

export const MESSAGE_TEMPLATE_PREVIEW_SAMPLES = {
  cliente: "Juan Pérez",
  tienda: "Ferremax",
  total: "$42.50",
  referencia: "A1B2C3D4",
  productos:
    "• 2x Taladro inalámbrico — $28.00\n• 1x Juego de brocas (12 pzas) — $14.50",
} as const;

export function getMessageTemplatePreviewValues(storeName?: string) {
  return {
    ...MESSAGE_TEMPLATE_PREVIEW_SAMPLES,
    tienda: storeName?.trim() || MESSAGE_TEMPLATE_PREVIEW_SAMPLES.tienda,
  };
}

export function defaultMessageTemplates(): MessageTemplatesSettings {
  return {
    nuevo:
      "Hola {{cliente}}, gracias por tu pedido en {{tienda}}.\n\n{{productos}}\n\nTotal: {{total}}\nReferencia: {{referencia}}\n\nEstamos revisando tu pago y te confirmaremos pronto.",
    confirmado:
      "Hola {{cliente}}, tu pedido en {{tienda}} fue confirmado y está en preparación.\n\n{{productos}}\n\nTotal: {{total}}",
    enviado:
      "Hola {{cliente}}, ¡buenas noticias! Tu pedido de {{tienda}} ya fue enviado.\n\n{{productos}}\n\nTotal: {{total}}\n\nGracias por tu compra.",
  };
}

/** Mapea el estado operativo del pedido a la plantilla de WhatsApp. */
export function resolveMessageTemplateKey(
  estado: OrderEstado,
): OrderMessageTemplateKey {
  switch (estado) {
    case "pendiente":
    case "verificando":
    case "cancelado":
      return "nuevo";
    case "en_preparacion":
      return "confirmado";
    case "enviado":
    case "entregado":
      return "enviado";
    default:
      return "nuevo";
  }
}
