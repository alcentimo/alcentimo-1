import {
  ORDER_ESTADO_LABELS,
  type OrderEstado,
} from "@/lib/orders/order-status";

export function formatOrderPublicId(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase();
}

const STATUS_UPDATE_DETAILS: Record<OrderEstado, string> = {
  por_pagar:
    "Tu pedido quedó registrado. Envíanos el comprobante de pago para verificarlo.",
  pendiente:
    "Recibimos tu comprobante y lo estamos verificando.",
  procesando:
    "Confirmamos tu pago. Tu pedido ya está en el centro de acopio.",
  preparacion_logistica:
    "Tu pedido está listo en el centro de acopio y se prepara el envío.",
  enviado:
    "¡Tu pedido ya va en camino! Pronto deberías recibirlo.",
  entregado:
    "¡Tu pedido ya va en camino! Pronto deberías recibirlo.",
  cancelado:
    "Tu pedido fue cancelado. Si tienes dudas, escríbenos por este chat.",
};

export interface OrderStatusWhatsAppMessageInput {
  customerName: string;
  storeName: string;
  orderId: string;
  newEstado: OrderEstado;
  trackingNumber?: string | null;
}

/**
 * Genera el texto de WhatsApp para avisar al cliente de un cambio de estado.
 */
export function buildOrderStatusUpdateWhatsAppMessage(
  input: OrderStatusWhatsAppMessageInput,
): string {
  const cliente = input.customerName.trim() || "cliente";
  const tienda = input.storeName.trim() || "nuestra tienda";
  const referencia = formatOrderPublicId(input.orderId);
  const estadoLabel = ORDER_ESTADO_LABELS[input.newEstado];
  const detail = STATUS_UPDATE_DETAILS[input.newEstado];
  const tracking = input.trackingNumber?.trim();

  const lines = [
    `¡Hola ${cliente}! Te saludamos de ${tienda}.`,
    `Te informamos que tu pedido ${referencia} acaba de pasar a estado: ${estadoLabel}.`,
    detail,
  ];

  if (input.newEstado === "enviado" && tracking) {
    lines.push(`Número de guía: ${tracking}`);
  }

  lines.push("Cualquier duda, estamos atentos por aquí.");

  return lines.join("\n\n");
}
