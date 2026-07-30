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
    case "pendiente":
      return "confirmar recepción";
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

function buildSystemPrompt(): string {
  return [
    'Mensajes WhatsApp sobre pedidos en español LATAM. JSON: { "message": string }',
    "Sin emojis. Máx 400 chars. Incluye cliente, ref, productos y total si cabe. Firma con tienda.",
  ].join(" ");
}

function buildUserPrompt(input: GenerateOrderWhatsAppMessageInput): string {
  const estado =
    input.intent === "status_update" && input.newEstado
      ? `nuevo:${ORDER_ESTADO_LABELS[input.newEstado]} (${estadoHint(input.newEstado)})`
      : `estado:${ORDER_ESTADO_LABELS[input.currentEstado]}`;

  return [
    `Tienda:${input.storeName.trim() || "tienda"}`,
    `Cliente:${input.customerName.trim() || "cliente"}`,
    `Ref:${input.orderReference} Total:${formatUsd(input.totalUsd)}`,
    estado,
    `Items:${input.productsSummary.trim() || "sin detalle"}`,
  ].join(" | ");
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
        { role: "system", content: buildSystemPrompt() },
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
