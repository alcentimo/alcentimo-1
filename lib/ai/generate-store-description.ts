import {
  createOpenRouterChatCompletion,
  OpenRouterChatError,
} from "@/lib/ai/openrouter-client";
import { AI_MAX_INPUT_CHARS, AI_MAX_TOKENS } from "@/lib/ai/token-limits";

const MAX_DESCRIPTION = 500;

export interface GenerateStoreDescriptionInput {
  storeName: string;
  storeRubro?: string | null;
  draftDescription?: string | null;
}

export interface GenerateStoreDescriptionResult {
  description: string;
}

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trimEnd();
}

function buildSystemPrompt(): string {
  return [
    'Redacta la descripción pública de una tienda en un catálogo digital. JSON: { "description": string }',
    `Español LATAM, 1-3 frases, máx ${MAX_DESCRIPTION} caracteres. Sin emojis, sin hashtags, sin inventar datos de contacto ni promesas falsas.`,
    "Tono comercial claro y confiable. Habla de lo que vende o ofrece la marca.",
  ].join(" ");
}

function buildUserPrompt(input: GenerateStoreDescriptionInput): string {
  const parts = [
    `Tienda:"${truncate(input.storeName, AI_MAX_INPUT_CHARS.storeName)}"`,
  ];

  if (input.storeRubro?.trim()) {
    parts.push(`Rubro:${input.storeRubro.trim()}`);
  }

  if (input.draftDescription?.trim()) {
    parts.push(
      `Borrador:"${truncate(input.draftDescription, AI_MAX_INPUT_CHARS.storeDescriptionDraft)}"`,
    );
  } else {
    parts.push("Sin borrador: genera una descripción nueva a partir del nombre y rubro.");
  }

  return parts.join(" | ");
}

function parseModelJson(content: string): GenerateStoreDescriptionResult {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new Error("La IA devolvió un formato inválido. Intenta de nuevo.");
  }

  const description =
    typeof parsed.description === "string"
      ? parsed.description
      : typeof parsed.storeDescription === "string"
        ? parsed.storeDescription
        : "";

  if (!description.trim()) {
    throw new Error("La IA no generó una descripción válida.");
  }

  return { description: truncate(description, MAX_DESCRIPTION) };
}

/** Genera o mejora la descripción de identidad de marca vía OpenRouter (gpt-4o-mini). */
export async function generateStoreDescription(
  input: GenerateStoreDescriptionInput,
): Promise<GenerateStoreDescriptionResult> {
  const storeName = input.storeName?.trim() ?? "";
  if (storeName.length < 2) {
    throw new Error(
      "Escribe el nombre comercial de la tienda antes de generar la descripción.",
    );
  }

  try {
    const content = await createOpenRouterChatCompletion({
      temperature: 0.6,
      max_tokens: AI_MAX_TOKENS.storeDescription,
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
