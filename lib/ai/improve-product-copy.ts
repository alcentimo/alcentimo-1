import {
  createOpenRouterChatCompletion,
  OpenRouterChatError,
} from "@/lib/ai/openrouter-client";
import { AI_MAX_TOKENS, AI_MAX_INPUT_CHARS } from "@/lib/ai/token-limits";
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
    'Copy e-commerce LATAM. JSON: { "title", "shortDescription", "description" }',
    `title≤${MAX_TITLE}, short≤${MAX_SHORT}, description≤${MAX_DESCRIPTION} (2-4 frases + 3-5 viñetas •). Sin emojis. No inventar specs.`,
  ].join(" ");
}

function buildUserPrompt(input: ImproveProductCopyInput): string {
  const focus = input.focus ?? "all";
  const parts = [`Enfoque:${focus}`];

  if (input.storeRubro?.trim()) parts.push(`Rubro:${input.storeRubro.trim()}`);
  if (input.categoryLabel?.trim()) parts.push(`Cat:${input.categoryLabel.trim()}`);
  if (input.draftTitle?.trim()) {
    parts.push(`Título:"${truncate(input.draftTitle, AI_MAX_INPUT_CHARS.draftTitle)}"`);
  }
  if (input.draftDescription?.trim()) {
    parts.push(
      `Desc:"${truncate(input.draftDescription, AI_MAX_INPUT_CHARS.draftDescription)}"`,
    );
  }

  return parts.join(" | ");
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
      temperature: 0.6,
      max_tokens: AI_MAX_TOKENS.productCopy,
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
