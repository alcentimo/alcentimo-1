import {
  createOpenRouterChatCompletion,
  OpenRouterChatError,
} from "@/lib/ai/openrouter-client";
import { AI_MAX_TOKENS, AI_MAX_INPUT_CHARS } from "@/lib/ai/token-limits";
import type {
  LandingAssistantMessage,
  LandingAssistantResponse,
} from "@/lib/ai/landing-assistant-types";

const MAX_USER_MESSAGE = AI_MAX_INPUT_CHARS.userMessage;
const MAX_HISTORY = 6;
const MAX_REPLY = 800;

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trimEnd();
}

function sanitizeMessages(
  messages: LandingAssistantMessage[],
): LandingAssistantMessage[] {
  return messages
    .filter(
      (message): message is LandingAssistantMessage =>
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

function buildSystemPrompt(): string {
  return [
    "Asistente comercial de Alcentimo (e-commerce LATAM: catálogo, inventario, pedidos, WhatsApp, IA).",
    "Español, 2-4 oraciones. Solo info de la plataforma. Registro gratis /dashboard/login?mode=signup.",
    "No menciones OpenAI ni precios exactos no listados.",
  ].join(" ");
}

export async function answerLandingAssistantQuestion(input: {
  messages: LandingAssistantMessage[];
}): Promise<LandingAssistantResponse> {
  const messages = sanitizeMessages(input.messages);
  if (messages.length === 0) {
    throw new OpenRouterChatError("Escribe tu pregunta para continuar.", 400);
  }

  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  if (!lastUser) {
    throw new OpenRouterChatError("Escribe tu pregunta para continuar.", 400);
  }

  const reply = await createOpenRouterChatCompletion({
    messages: [
      { role: "system", content: buildSystemPrompt() },
      ...messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ],
    temperature: 0.4,
    max_tokens: AI_MAX_TOKENS.landingChat,
  });

  return { reply: truncate(reply, MAX_REPLY) };
}
