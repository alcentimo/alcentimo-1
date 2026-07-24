import { getOpenAiApiKey } from "@/lib/env/server";
import type {
  StorefrontAssistantContext,
  StorefrontAssistantMessage,
} from "@/lib/ai/storefront-assistant-types";

const MAX_USER_MESSAGE = 500;
const MAX_HISTORY = 8;
const MAX_REPLY = 1200;

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trimEnd();
}

function sanitizeMessages(
  messages: StorefrontAssistantMessage[],
): StorefrontAssistantMessage[] {
  return messages
    .filter(
      (message): message is StorefrontAssistantMessage =>
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

function buildSystemPrompt(context: StorefrontAssistantContext): string {
  return [
    `Eres el asistente virtual de atención al cliente de "${context.storeName}".`,
    "Respondes en español neutro, amable, breve y útil (2–5 oraciones salvo que el comprador pida listas).",
    "Usa SOLO la información del contexto JSON. Si no tienes un dato, dilo con honestidad y sugiere contactar a la tienda.",
    "No inventes tallas, stock, precios, direcciones ni plazos que no aparezcan en el contexto.",
    "No menciones que eres IA ni hables de OpenAI.",
    "Para stock y tallas, revisa variantes y atributos del producto.",
    context.selectedLocationName
      ? `El comprador consulta stock en la sucursal: ${context.selectedLocationName}.`
      : "Si hay varias sucursales, indica en cuál hay stock cuando sea relevante.",
    context.whatsappAvailable
      ? "Si la consulta requiere atención humana, sugiere el botón de WhatsApp del catálogo."
      : "",
    "",
    "Contexto de la tienda (JSON):",
    JSON.stringify(context),
  ]
    .filter(Boolean)
    .join("\n");
}

export async function answerStorefrontAssistantQuestion(input: {
  context: StorefrontAssistantContext;
  messages: StorefrontAssistantMessage[];
}): Promise<string> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new Error(
      "El asistente no está disponible en este momento. Intenta más tarde o contáctanos por WhatsApp.",
    );
  }

  const history = sanitizeMessages(input.messages);
  if (history.length === 0 || history[history.length - 1]?.role !== "user") {
    throw new Error("Escribe tu pregunta para continuar.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.55,
      max_tokens: 450,
      messages: [
        { role: "system", content: buildSystemPrompt(input.context) },
        ...history.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(
        "Estamos recibiendo muchas consultas. Espera un momento e intenta de nuevo.",
      );
    }
    throw new Error(
      "No pudimos responder en este momento. Intenta de nuevo en unos segundos.",
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("No recibimos respuesta. Intenta reformular tu pregunta.");
  }

  return truncate(content, MAX_REPLY);
}
