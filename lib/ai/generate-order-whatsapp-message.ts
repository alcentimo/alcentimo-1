import {
  createOpenRouterChatCompletion,
  OpenRouterChatError,
} from "@/lib/ai/openrouter-client";
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

const MAX_MESSAGE_LENGTH = 900;

function truncateMessage(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= MAX_MESSAGE_LENGTH) return trimmed;
  return trimmed.slice(0, MAX_MESSAGE_LENGTH).trimEnd();
}

function intentInstruction(input: GenerateOrderWhatsAppMessageInput): string {
  if (input.intent === "status_update" && input.newEstado) {
    const label = ORDER_ESTADO_LABELS[input.newEstado];
    return [
      `Objetivo: avisar al cliente que su pedido cambió a estado "${label}".`,
      "Explica el cambio con claridad y tranquilidad.",
      statusDetail(input.newEstado),
    ].join(" ");
  }

  const label = ORDER_ESTADO_LABELS[input.currentEstado];
  return [
    `Objetivo: contactar al cliente sobre su pedido (estado actual: ${label}).`,
    "Mensaje amigable y profesional para WhatsApp.",
  ].join(" ");
}

function statusDetail(estado: OrderEstado): string {
  switch (estado) {
    case "pendiente":
      return "Confirma que recibiste el pedido y que lo procesarás pronto.";
    case "en_preparacion":
      return "Indica que el pedido ya está en preparación.";
    case "entregado":
      return "Confirma la entrega y agradece la compra.";
    case "enviado":
      return "Indica que el pedido ya va en camino.";
    case "verificando":
      return "Indica que estás verificando el pago.";
    case "cancelado":
      return "Informa la cancelación con respeto y ofrece ayuda si tiene dudas.";
    default:
      return "";
  }
}

function buildSystemPrompt(): string {
  return [
    "Eres un experto en comunicación comercial por WhatsApp para comerciantes latinoamericanos.",
    "Redactas mensajes cortos, naturales y listos para enviar al cliente sobre pedidos.",
    'Responde ÚNICAMENTE con JSON válido (sin markdown): { "message": string }',
    "Reglas estrictas:",
    "- Español neutro latinoamericano. Sin emojis.",
    "- Máximo 550 caracteres. Párrafos cortos, fáciles de leer en móvil.",
    "- Incluye nombre del cliente, referencia del pedido, productos y total cuando sea natural.",
    "- NO inventes fechas de entrega, descuentos ni datos no proporcionados.",
    "- Firma brevemente con el nombre de la tienda al final.",
    "- Un solo mensaje coherente, sin viñetas ni encabezados.",
  ].join("\n");
}

function buildUserPrompt(input: GenerateOrderWhatsAppMessageInput): string {
  const estadoContext =
    input.intent === "status_update" && input.newEstado
      ? `Nuevo estado: ${ORDER_ESTADO_LABELS[input.newEstado]}.`
      : `Estado actual: ${ORDER_ESTADO_LABELS[input.currentEstado]}.`;

  return [
    `Tienda: ${input.storeName.trim() || "mi tienda"}.`,
    `Cliente: ${input.customerName.trim() || "cliente"}.`,
    `Referencia del pedido: ${input.orderReference}.`,
    `Total: ${formatUsd(input.totalUsd)}.`,
    estadoContext,
    "Productos:",
    input.productsSummary.trim() || "Sin detalle de productos.",
    intentInstruction(input),
  ].join("\n");
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
      temperature: 0.6,
      max_tokens: 400,
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
