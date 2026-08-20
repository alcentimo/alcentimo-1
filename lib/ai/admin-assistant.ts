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
const MAX_REPLY = 2800;
const MAX_CONTEXT_CHARS = 22_000;

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
    "Eres el asistente gerencial interno de Alcéntimo (panel admin SaaS).",
    "Responde en español, claro, directo y operativo. No inventes datos: usa solo el contexto JSON (consultado en tiempo real desde la base de datos).",
    "Tienes visibilidad de TODO el SaaS en este contexto:",
    "- Comunidad: dropshippers (storesSample, recentRegistrations, usersNearProductLimit) y proveedores registrados.",
    "- Pagos de suscripción (datos internos, sin pestaña en el panel): pendingPaymentsSample, verifiedPaymentsSample, paymentStatusCounts.",
    "- Soporte: pendingSupportMessages, recentSupportMessages, supportStatusCounts (mensajes pendientes/atendidos).",
    "- Cupones, ofertas y precios (datos internos): activeCoupons, activeCampaigns, plans (precios, límites de productos/sedes).",
    "- Lookups dirigidos: targetedLookups (por nombre, slug, correo, cupón o texto de soporte).",
    "Para “hoy/ayer/semana” usa calendar.timezone + todayLocalDate/yesterdayLocalDate frente a accountRegisteredAt o storeCreatedAt.",
    "REGLAS ESTRICTAS:",
    "1) Nunca digas que no tienes acceso, que no tienes información, o que el admin debe ir a otra pestaña/sección del panel.",
    "2) Responde siempre con los datos del contexto. Si un listado viene vacío, dilo como dato (p. ej. “0 pagos pendientes”) y no como falta de acceso.",
    "3) Si el dato no aparece en el JSON, responde con lo más cercano disponible en el contexto y aclara el alcance (p. ej. muestra reciente / últimos 14 días), sin mandar a revisar otra pantalla.",
    "4) No menciones OpenAI, OpenRouter ni que eres un modelo. No ejecutes cambios; solo consulta y asesora.",
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
      temperature: 0.25,
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
