import {
  createOpenRouterChatCompletion,
  OpenRouterChatError,
} from "@/lib/ai/openrouter-client";
import { AI_MAX_TOKENS } from "@/lib/ai/token-limits";
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

const MAX_MESSAGE_LENGTH = 500;

function truncateMessage(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= MAX_MESSAGE_LENGTH) return trimmed;
  return trimmed.slice(0, MAX_MESSAGE_LENGTH).trimEnd();
}

function goalLabel(goal: CustomerMessageGoal): string {
  return goal === "reactivacion" ? "reactivar cliente inactivo" : "agradecer cliente frecuente";
}

function lastOrderLabel(input: GenerateCustomerWhatsAppMessageInput): string {
  if (!input.lastOrderAt) return "sin compras";
  if (input.daysSinceLastOrder == null) return "con historial";
  const days = Math.max(0, Math.round(input.daysSinceLastOrder));
  if (days === 0) return "compró hoy";
  if (days === 1) return "compró ayer";
  return `última compra hace ${days}d`;
}

function buildSystemPrompt(): string {
  return [
    'Redacta mensajes WhatsApp comerciales en español LATAM. JSON: { "message": string }',
    "Sin emojis. Máx 400 chars. Un párrafo. Firma con nombre tienda. No inventes promos.",
  ].join(" ");
}

function buildUserPrompt(input: GenerateCustomerWhatsAppMessageInput): string {
  return [
    `Tienda:${input.storeName.trim() || "tienda"}`,
    `Cliente:${input.customerName.trim() || "cliente"}`,
    `Pedidos:${input.orderCount} Total:${formatUsd(input.totalSpentUsd)} ${lastOrderLabel(input)}`,
    `Objetivo:${goalLabel(input.goal)}`,
  ].join(" | ");
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
      temperature: 0.6,
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
