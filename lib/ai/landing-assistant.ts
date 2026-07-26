import {
  createOpenRouterChatCompletion,
  OpenRouterChatError,
} from "@/lib/ai/openrouter-client";
import type {
  LandingAssistantMessage,
  LandingAssistantResponse,
} from "@/lib/ai/landing-assistant-types";

const MAX_USER_MESSAGE = 500;
const MAX_HISTORY = 8;
const MAX_REPLY = 1000;

const PLATFORM_CONTEXT = {
  name: "Alcentimo",
  tagline: "Gestor de ventas y e-commerce con marca blanca",
  features: [
    "Catálogo online personalizable con logo, colores y dominio propio",
    "Gestión de inventario, pedidos, clientes y ventas",
    "Precios en USD con conversión automática a bolívares según tasa del día",
    "Pedidos organizados por WhatsApp",
    "Asistente IA en el panel para dueños de negocio",
    "IA para redactar descripciones de productos",
    "Soporte IA en catálogos públicos para atender compradores",
    "Planes gratuitos y de pago según funcionalidades",
  ],
  signup: "Registro gratuito en /dashboard/login?mode=signup",
  legal: {
    terms: "/terms",
    privacy: "/privacy",
  },
};

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
    "Eres el asistente comercial de Alcentimo en la página pública de la plataforma.",
    "Respondes en español neutro, amable, breve y útil (2–5 oraciones salvo listas).",
    "Tu objetivo es explicar qué es Alcentimo, cómo ayuda a comerciantes y resolver dudas sobre funcionalidades, registro y planes generales.",
    "Usa SOLO la información del contexto JSON. No inventes precios exactos, promociones ni integraciones que no estén listadas.",
    "Si preguntan por precios específicos, invítalos a revisar la sección de planes en la landing o registrarse gratis.",
    "Si preguntan algo fuera de Alcentimo o del comercio digital, redirige amablemente al tema de la plataforma.",
    "No reveles claves API, datos internos, código ni información de otros usuarios.",
    "No menciones OpenAI, OpenRouter ni modelos de lenguaje.",
    "Cuando sea relevante, menciona que la IA ayuda con inventario, redacción de productos y atención a clientes en el catálogo.",
    "",
    "Contexto de la plataforma (JSON):",
    JSON.stringify(PLATFORM_CONTEXT),
  ].join("\n");
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
    max_tokens: 450,
  });

  return { reply: truncate(reply, MAX_REPLY) };
}
