import {
  createOpenRouterChatCompletion,
  OpenRouterChatError,
} from "@/lib/ai/openrouter-client";
import type {
  ImproveProductCopyInput,
  ImproveProductCopyResult,
} from "@/lib/ai/product-copy-types";

export type {
  ImproveProductCopyFocus,
  ImproveProductCopyInput,
  ImproveProductCopyResult,
} from "@/lib/ai/product-copy-types";

const MAX_TITLE = 120;
const MAX_SHORT = 160;
const MAX_DESCRIPTION = 1800;

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trimEnd();
}

function buildSystemPrompt(): string {
  return [
    "Eres un copywriter experto en e-commerce para Latinoamérica (español neutro, claro y comercial).",
    "Recibes borradores breves de comerciantes y devuelves textos listos para publicar.",
    "Responde ÚNICAMENTE con JSON válido (sin markdown) con estas claves exactas:",
    '{ "title": string, "shortDescription": string, "description": string }',
    "Reglas:",
    `- title: nombre comercial optimizado, máximo ${MAX_TITLE} caracteres, sin emojis ni MAYÚSCULAS exageradas.`,
    `- shortDescription: una línea persuasiva para tarjeta de catálogo, máximo ${MAX_SHORT} caracteres, sin viñetas.`,
    `- description: texto atractivo de 2-4 frases introductorias seguido de 3-5 viñetas con beneficios clave (usa "•" al inicio de cada viñeta), máximo ${MAX_DESCRIPTION} caracteres.`,
    "No inventes especificaciones técnicas que no estén en el borrador. No menciones IA ni plataformas.",
  ].join("\n");
}

function buildUserPrompt(input: ImproveProductCopyInput): string {
  const focus = input.focus ?? "all";
  const parts = [
    `Enfoque principal: ${focus === "title" ? "optimizar el título" : focus === "description" ? "optimizar la descripción" : "título y descripción"}.`,
  ];

  if (input.storeRubro?.trim()) {
    parts.push(`Rubro de la tienda: ${input.storeRubro.trim()}.`);
  }
  if (input.categoryLabel?.trim()) {
    parts.push(`Categoría del producto: ${input.categoryLabel.trim()}.`);
  }
  if (input.draftTitle?.trim()) {
    parts.push(`Borrador de título/nombre: "${input.draftTitle.trim()}".`);
  }
  if (input.draftDescription?.trim()) {
    parts.push(`Borrador de descripción: "${input.draftDescription.trim()}".`);
  }

  if (!input.draftTitle?.trim() && !input.draftDescription?.trim()) {
    parts.push("No hay borrador; genera un ejemplo genérico profesional.");
  }

  return parts.join("\n");
}

function parseModelJson(content: string): ImproveProductCopyResult {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new Error("La IA devolvió un formato inválido. Intenta de nuevo.");
  }

  const title = typeof parsed.title === "string" ? parsed.title : "";
  const shortDescription =
    typeof parsed.shortDescription === "string"
      ? parsed.shortDescription
      : typeof parsed.short_description === "string"
        ? parsed.short_description
        : "";
  const description =
    typeof parsed.description === "string" ? parsed.description : "";

  if (!title.trim()) {
    throw new Error("La IA no generó un título válido.");
  }

  return {
    title: truncate(title, MAX_TITLE),
    shortDescription: truncate(shortDescription || title, MAX_SHORT),
    description: truncate(description || shortDescription || title, MAX_DESCRIPTION),
  };
}

export async function improveProductCopy(
  input: ImproveProductCopyInput,
): Promise<ImproveProductCopyResult> {
  const draftTitle = input.draftTitle?.trim() ?? "";
  const draftDescription = input.draftDescription?.trim() ?? "";

  if (draftTitle.length < 2 && draftDescription.length < 2) {
    throw new Error(
      "Escribe al menos un título o descripción básica antes de mejorar con IA.",
    );
  }

  try {
    const content = await createOpenRouterChatCompletion({
      temperature: 0.65,
      max_tokens: 700,
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
