import {
  createOpenRouterChatCompletion,
  OpenRouterChatError,
} from "@/lib/ai/openrouter-client";
import { AI_MAX_TOKENS, AI_MAX_INPUT_CHARS } from "@/lib/ai/token-limits";
import type {
  AdminAssistantContext,
  AdminAssistantMessage,
} from "@/lib/ai/admin-assistant-types";

const MAX_USER_MESSAGE = AI_MAX_INPUT_CHARS.userMessage;
const MAX_HISTORY = 10;
const MAX_REPLY = 2500;
const MAX_CONTEXT_CHARS = 18_000;

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trimEnd();
}

function sanitizeMessages(
  messages: AdminAssistantMessage[],
): AdminAssistantMessage[] {
  return messages
    .filter(
      (message): message is AdminAssistantMessage =>
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

function compactContext(context: AdminAssistantContext): string {
  return truncate(JSON.stringify(context), MAX_CONTEXT_CHARS);
}

function buildSystemPrompt(context: AdminAssistantContext): string {
  return [
    "Eres el asistente de soporte técnico interno y consulta de datos de Alcéntimo (panel admin SaaS).",
    "Responde en español, claro y operativo. No inventes datos: usa solo el contexto JSON.",
    "Puedes informar correos, planes, estados de tiendas, métricas, pagos manuales y fechas de registro.",
    "Fechas disponibles por tienda/usuario: accountRegisteredAt (auth.users.created_at, alta de la cuenta) y storeCreatedAt (stores.created_at, alta de la tienda).",
    "Para “hoy”, “ayer”, “esta semana”, etc. usa calendar.timezone y calendar.todayLocalDate / yesterdayLocalDate; compara contra accountRegisteredAt o storeCreatedAt.",
    "Prioriza recentRegistrations para altas recientes; storesSample y targetedLookups también traen fechas.",
    "Si falta un dato en el contexto, dilo y sugiere dónde mirar en el panel (Pagos, Tiendas, Soporte).",
    "No menciones OpenAI, OpenRouter ni que eres un modelo. No ejecutes cambios; solo consulta/asesora.",
    "Enlaces útiles: [Resumen](/admin/dashboard?tab=resumen) [Pagos](/admin/dashboard?tab=pagos) [Tiendas](/admin/dashboard?tab=tiendas) [Soporte](/admin/dashboard?tab=soporte)",
    "Contexto:",
    compactContext(context),
  ].join("\n");
}

export async function answerAdminAssistantQuestion(input: {
  context: AdminAssistantContext;
  messages: AdminAssistantMessage[];
}): Promise<string> {
  const history = sanitizeMessages(input.messages);
  if (history.length === 0 || history[history.length - 1]?.role !== "user") {
    throw new Error("Escribe tu pregunta para continuar.");
  }

  try {
    const content = await createOpenRouterChatCompletion({
      temperature: 0.3,
      max_tokens: AI_MAX_TOKENS.adminChat,
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
