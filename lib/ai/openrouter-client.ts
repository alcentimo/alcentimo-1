import { getOpenAiApiKey, getPublicSiteUrl } from "@/lib/env/server";

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const OPENROUTER_CHAT_MODEL = "openai/gpt-4o-mini";
export const OPENROUTER_APP_TITLE = "Alcentimo";

export type OpenRouterChatRole = "system" | "user" | "assistant";

export interface OpenRouterChatMessage {
  role: OpenRouterChatRole;
  content: string;
}

export interface CreateOpenRouterChatCompletionOptions {
  messages: OpenRouterChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" };
}

export function getOpenRouterChatCompletionsUrl(): string {
  return `${OPENROUTER_BASE_URL}/chat/completions`;
}

export function getOpenRouterRequestHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": getPublicSiteUrl(),
    "X-Title": OPENROUTER_APP_TITLE,
  };
}

export class OpenRouterChatError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenRouterChatError";
    this.status = status;
  }
}

export async function createOpenRouterChatCompletion(
  options: CreateOpenRouterChatCompletionOptions,
): Promise<string> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new OpenRouterChatError(
      "La IA no está configurada. Añade OPENAI_API_KEY en las variables de entorno.",
      503,
    );
  }

  const response = await fetch(getOpenRouterChatCompletionsUrl(), {
    method: "POST",
    headers: getOpenRouterRequestHeaders(apiKey),
    body: JSON.stringify({
      model: OPENROUTER_CHAT_MODEL,
      messages: options.messages,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      response_format: options.response_format,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    if (response.status === 429) {
      throw new OpenRouterChatError(
        "Demasiadas solicitudes a la IA. Espera un momento e intenta de nuevo.",
        429,
      );
    }
    throw new OpenRouterChatError(
      errorBody.includes("invalid") && errorBody.includes("key")
        ? "Clave de API inválida. Revisa OPENAI_API_KEY."
        : "No se pudo contactar con la IA. Intenta de nuevo en unos segundos.",
      response.status,
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new OpenRouterChatError(
      "La IA no devolvió contenido. Intenta de nuevo.",
      502,
    );
  }

  return content;
}
