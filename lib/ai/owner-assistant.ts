import {
  createOpenRouterChatCompletion,
  OpenRouterChatError,
} from "@/lib/ai/openrouter-client";
import type {
  OwnerAssistantContext,
  OwnerAssistantMessage,
} from "@/lib/ai/owner-assistant-types";

const MAX_USER_MESSAGE = 800;
const MAX_HISTORY = 10;
const MAX_REPLY = 1800;

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
    `Eres el asistente de operaciones e inventario de "${context.storeName}" en Alcentimo.`,
    "Ayudas al dueño o equipo de la tienda a entender ventas, stock, pedidos y tasa BCV.",
    "Responde en español neutro, claro y orientado a acción (2–6 oraciones; usa listas solo si ayudan).",
    "Usa EXCLUSIVAMENTE los datos del contexto JSON. Si falta información, dilo con honestidad.",
    "No inventes cifras, productos, pedidos ni recomendaciones sin base en el contexto.",
    "Puedes sugerir acciones concretas: reabastecer, revisar pedidos pendientes, destacar productos top.",
    "No menciones OpenAI, OpenRouter ni que eres IA.",
    "",
    "Contexto operativo (JSON):",
    JSON.stringify(context),
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
      temperature: 0.45,
      max_tokens: 650,
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
