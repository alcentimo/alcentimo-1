import {
  createOpenRouterChatCompletion,
  OpenRouterChatError,
} from "@/lib/ai/openrouter-client";
import { AI_MAX_TOKENS } from "@/lib/ai/token-limits";
import type {
  GenerateOrderWhatsAppMessageInput,
  GenerateOrderWhatsAppMessageResult,
  OrderWhatsAppMessageIntent,
} from "@/lib/ai/order-message-types";
import {
  ORDER_ESTADO_LABELS,
  type OrderEstado,
} from "@/lib/orders/order-status";
import { formatUsd } from "@/lib/format";

export type {
  GenerateOrderWhatsAppMessageInput,
  GenerateOrderWhatsAppMessageResult,
  OrderWhatsAppMessageIntent,
} from "@/lib/ai/order-message-types";

const MAX_MESSAGE_LENGTH = 500;

function truncateMessage(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= MAX_MESSAGE_LENGTH) return trimmed;
  return trimmed.slice(0, MAX_MESSAGE_LENGTH).trimEnd();
}

function estadoHint(estado: OrderEstado): string {
  switch (estado) {
    case "por_pagar":
      return "falta comprobante de pago";
    case "pendiente":
      return "confirmar recepción / verificar pago";
    case "procesando":
      return "pago confirmado, armando pedido";
    case "entregado":
      return "entregado, agradecer";
    case "enviado":
      return "en camino";
    case "cancelado":
      return "cancelado";
    default:
      return ORDER_ESTADO_LABELS[estado];
  }
}

function intentBrief(intent: OrderWhatsAppMessageIntent): string {
  switch (intent) {
    case "order_confirmation":
      return "Objetivo: confirmación de pedido (recibido / en preparación).";
    case "shipping_notice":
      return "Objetivo: notificación de envío o guía de despacho.";
    case "payment_reminder":
      return "Objetivo: recordatorio amable de pago o confirmación de transferencia.";
    case "status_update":
      return "Objetivo: avisar el nuevo estado del pedido.";
    case "general":
    default:
      return "Objetivo: mensaje claro sobre el pedido.";
  }
}

function buildSystemPrompt(intent: OrderWhatsAppMessageIntent): string {
  return [
    "Mensajes WhatsApp sobre pedidos en español LATAM. JSON: { \"message\": string }",
    "Sin emojis. Máx 400 chars.",
    "Incluye SIEMPRE: nombre del cliente, referencia del pedido, resumen de productos y total.",
    "Firma con el nombre de la tienda.",
    intentBrief(intent),
    intent === "shipping_notice"
      ? "Si hay número de guía, inclúyelo. Si no, indica que el pedido ya fue despachado."
      : "",
    intent === "payment_reminder"
      ? "Sé cordial y concreto: menciona el total pendiente sin sonar agresivo."
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildUserPrompt(input: GenerateOrderWhatsAppMessageInput): string {
  const estado =
    input.intent === "status_update" && input.newEstado
      ? `nuevo:${ORDER_ESTADO_LABELS[input.newEstado]} (${estadoHint(input.newEstado)})`
      : `estado:${ORDER_ESTADO_LABELS[input.currentEstado]}`;

  const tracking = input.trackingNumber?.trim()
    ? `Guía:${input.trackingNumber.trim()}`
    : null;

  return [
    `Tienda:${input.storeName.trim() || "tienda"}`,
    `Cliente:${input.customerName.trim() || "cliente"}`,
    `Ref:${input.orderReference} Total:${formatUsd(input.totalUsd)}`,
    `Intent:${input.intent}`,
    estado,
    tracking,
    `Items:${input.productsSummary.trim() || "sin detalle"}`,
  ]
    .filter(Boolean)
    .join(" | ");
}

function parseModelJson(content: string): GenerateOrderWhatsAppMessageResult {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new Error("La IA devolvió un formato inválido. Intenta de nuevo.");
  }

  const message =
    typeof parsed.message === "string"
      ? parsed.message
      : typeof parsed.template === "string"
        ? parsed.template
        : "";

  if (!message.trim()) {
    throw new Error("La IA no generó un mensaje válido.");
  }

  return { message: truncateMessage(message) };
}

export async function generateOrderWhatsAppMessage(
  input: GenerateOrderWhatsAppMessageInput,
): Promise<GenerateOrderWhatsAppMessageResult> {
  try {
    const content = await createOpenRouterChatCompletion({
      temperature: 0.55,
      max_tokens: AI_MAX_TOKENS.whatsappMessage,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(input.intent) },
        { role: "user", content: buildUserPrompt(input) },
      ],
    });

    return parseModelJson(content);
  } catch (error) {
    if (error instanceof OpenRouterChatError) {
      throw new Error(error.message);
    }
    throw error;
  }
}
