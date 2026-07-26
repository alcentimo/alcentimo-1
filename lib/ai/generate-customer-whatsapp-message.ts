import {
  createOpenRouterChatCompletion,
  OpenRouterChatError,
} from "@/lib/ai/openrouter-client";
import type {
  CustomerMessageGoal,
  GenerateCustomerWhatsAppMessageInput,
  GenerateCustomerWhatsAppMessageResult,
} from "@/lib/ai/customer-message-types";
import { formatUsd } from "@/lib/format";

export type {
  CustomerMessageGoal,
  GenerateCustomerWhatsAppMessageInput,
  GenerateCustomerWhatsAppMessageResult,
} from "@/lib/ai/customer-message-types";

const MAX_MESSAGE_LENGTH = 900;

function truncateMessage(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= MAX_MESSAGE_LENGTH) return trimmed;
  return trimmed.slice(0, MAX_MESSAGE_LENGTH).trimEnd();
}

function goalInstruction(goal: CustomerMessageGoal): string {
  if (goal === "reactivacion") {
    return [
      "Objetivo: reactivar al cliente.",
      "Saludo cordial, menciona que hace tiempo que no compra (si aplica) o invítalo a volver.",
      "Puedes ofrecer un incentivo suave (descuento, novedades, productos destacados) sin inventar porcentajes concretos.",
      "No presiones; tono amable y personal.",
    ].join(" ");
  }

  return [
    "Objetivo: agradecer y fidelizar.",
    "Reconoce su confianza y compras previas.",
    "Refuerza la relación con un mensaje cálido y profesional.",
    "Puedes mencionar que valoras clientes como él/ella.",
  ].join(" ");
}

function formatLastOrderContext(input: GenerateCustomerWhatsAppMessageInput): string {
  if (!input.lastOrderAt) {
    return "Última compra: nunca ha comprado (solo registrado).";
  }

  const formatted = new Intl.DateTimeFormat("es", {
    dateStyle: "long",
    timeStyle: undefined,
  }).format(new Date(input.lastOrderAt));

  if (input.daysSinceLastOrder == null) {
    return `Última compra: ${formatted}.`;
  }

  const days = Math.max(0, Math.round(input.daysSinceLastOrder));
  if (days === 0) {
    return `Última compra: hoy (${formatted}).`;
  }
  if (days === 1) {
    return `Última compra: ayer (${formatted}).`;
  }

  return `Última compra: hace ${days} días (${formatted}).`;
}

function buildSystemPrompt(): string {
  return [
    "Eres un experto en comunicación comercial por WhatsApp para comerciantes latinoamericanos.",
    "Redactas mensajes cortos, naturales y listos para enviar al cliente.",
    'Responde ÚNICAMENTE con JSON válido (sin markdown): { "message": string }',
    "Reglas estrictas:",
    "- Español neutro latinoamericano. Sin emojis.",
    "- Máximo 600 caracteres. Párrafos cortos, fáciles de leer en móvil.",
    "- Usa el nombre del cliente de forma natural.",
    "- Puedes mencionar datos reales del historial (pedidos, total gastado, última compra).",
    "- NO inventes descuentos, fechas, productos ni promociones específicas no indicadas.",
    "- Firma de forma breve con el nombre de la tienda al final.",
    "- Un solo mensaje coherente, sin viñetas ni encabezados.",
  ].join("\n");
}

function buildUserPrompt(input: GenerateCustomerWhatsAppMessageInput): string {
  return [
    `Tienda: ${input.storeName.trim() || "mi tienda"}.`,
    `Cliente: ${input.customerName.trim() || "cliente"}.`,
    `Pedidos realizados: ${input.orderCount}.`,
    `Total gastado: ${formatUsd(input.totalSpentUsd)}.`,
    formatLastOrderContext(input),
    goalInstruction(input.goal),
  ].join("\n");
}

function parseModelJson(content: string): GenerateCustomerWhatsAppMessageResult {
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

export async function generateCustomerWhatsAppMessage(
  input: GenerateCustomerWhatsAppMessageInput,
): Promise<GenerateCustomerWhatsAppMessageResult> {
  try {
    const content = await createOpenRouterChatCompletion({
      temperature: 0.65,
      max_tokens: 350,
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
