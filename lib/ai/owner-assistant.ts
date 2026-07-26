import {
  createOpenRouterChatCompletion,
  OpenRouterChatError,
} from "@/lib/ai/openrouter-client";
import { compactOwnerContextForPrompt } from "@/lib/ai/compact-prompt-context";
import { AI_MAX_TOKENS, AI_MAX_INPUT_CHARS } from "@/lib/ai/token-limits";
import type {
  OwnerAssistantContext,
  OwnerAssistantMessage,
} from "@/lib/ai/owner-assistant-types";

const MAX_USER_MESSAGE = AI_MAX_INPUT_CHARS.userMessage;
const MAX_HISTORY = 8;
const MAX_REPLY = 2000;

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trimEnd();
}

function sanitizeMessages(
  messages: OwnerAssistantMessage[],
): OwnerAssistantMessage[] {
  return messages
    .filter(
      (message): message is OwnerAssistantMessage =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0,
    )
    .slice(-MAX_HISTORY)
    .map((message) => ({
      role: message.role,
      content: truncate(message.content, MAX_USER_MESSAGE),
    }));
}

function buildSystemPrompt(context: OwnerAssistantContext): string {
  return [
    `Consultor de ventas de "${context.storeName}". Español, accionable, proactivo.`,
    "Solo datos del contexto. No inventes cifras. No menciones OpenAI/IA.",
    "Stock bajo/agotado/lento/exceso, ventas, clientes VIP, pagos pendientes.",
    "Sugiere promos/combos para baja rotación. Textos WhatsApp listos para copiar si piden.",
    "Enlaces panel: [Pedidos](/dashboard/pedidos) [Catálogo](/dashboard/catalogo) [Clientes](/dashboard/clientes) [Analíticas](/dashboard/analiticas)",
    "Contexto:",
    compactOwnerContextForPrompt(context),
  ].join("\n");
}

export async function answerOwnerAssistantQuestion(input: {
  context: OwnerAssistantContext;
  messages: OwnerAssistantMessage[];
}): Promise<string> {
  const history = sanitizeMessages(input.messages);
  if (history.length === 0 || history[history.length - 1]?.role !== "user") {
    throw new Error("Escribe tu pregunta para continuar.");
  }

  try {
    const content = await createOpenRouterChatCompletion({
      temperature: 0.5,
      max_tokens: AI_MAX_TOKENS.ownerChat,
      messages: [
        { role: "system", content: buildSystemPrompt(input.context) },
        ...history.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
    });

    return truncate(content, MAX_REPLY);
  } catch (error) {
    if (error instanceof OpenRouterChatError) {
      throw new Error(error.message);
    }
    throw error;
  }
}
