import {
  createOpenRouterChatCompletion,
  OpenRouterChatError,
} from "@/lib/ai/openrouter-client";
import { AI_MAX_INPUT_CHARS, AI_MAX_TOKENS } from "@/lib/ai/token-limits";
import { STORE_DESCRIPTION_MAX_LENGTH } from "@/lib/stores/description";

const MAX_DESCRIPTION = STORE_DESCRIPTION_MAX_LENGTH;

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
    'Redacta la descripción pública de una tienda para la cabecera compacta de un catálogo. JSON: { "description": string }',
    `Español LATAM, exactamente 1 o 2 oraciones breves y directas, máx ${MAX_DESCRIPTION} caracteres.`,
    "Sin emojis, sin hashtags, sin inventar datos de contacto ni promesas falsas.",
    "Tono comercial claro. Di qué vende o ofrece la marca en pocas palabras.",
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
    parts.push("Acorta y mejora el borrador a 1-2 oraciones.");
  } else {
    parts.push(
      "Sin borrador: genera 1-2 oraciones nuevas a partir del nombre y rubro.",
    );
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
      temperature: 0.5,
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
