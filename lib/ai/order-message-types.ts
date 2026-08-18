import type { OrderEstado } from "@/lib/orders/order-status";

/**
 * Intenciones de mensaje WhatsApp para pedidos.
 * `status_update` se usa al cambiar el estado del pedido (prompt automático).
 */
export type OrderWhatsAppMessageIntent =
  | "order_confirmation"
  | "shipping_notice"
  | "payment_reminder"
  | "status_update"
  | "general";

export interface OrderMessageGoalOption {
  value: Exclude<
    OrderWhatsAppMessageIntent,
    "status_update" | "general"
  >;
  label: string;
  description: string;
}

export const ORDER_MESSAGE_GOAL_OPTIONS: OrderMessageGoalOption[] = [
  {
    value: "order_confirmation",
    label: "Confirmación de pedido",
    description: "Confirma que recibiste el pedido y que lo estás preparando.",
  },
  {
    value: "shipping_notice",
    label: "Notificación de envío",
    description: "Avisa el despacho, guía o que el pedido ya va en camino.",
  },
  {
    value: "payment_reminder",
    label: "Recordatorio de pago",
    description: "Recuerda el total pendiente o pide confirmar el pago.",
  },
];

export function suggestOrderMessageIntent(
  estado: OrderEstado,
): OrderMessageGoalOption["value"] {
  switch (estado) {
    case "por_pagar":
    case "pendiente":
      return "payment_reminder";
    case "enviado":
    case "entregado":
      return "shipping_notice";
    case "procesando":
    case "preparacion_logistica":
    case "cancelado":
    default:
      return "order_confirmation";
  }
}

export function isOrderMessageGoal(
  value: unknown,
): value is OrderMessageGoalOption["value"] {
  return (
    value === "order_confirmation" ||
    value === "shipping_notice" ||
    value === "payment_reminder"
  );
}

export interface GenerateOrderWhatsAppMessageInput {
  customerName: string;
  storeName: string;
  orderReference: string;
  totalUsd: number;
  productsSummary: string;
  currentEstado: OrderEstado;
  newEstado?: OrderEstado;
  intent: OrderWhatsAppMessageIntent;
  trackingNumber?: string | null;
}

export interface GenerateOrderWhatsAppMessageResult {
  message: string;
}
