import {
  createOpenRouterChatCompletion,
  OpenRouterChatError,
} from "@/lib/ai/openrouter-client";
import { AI_MAX_TOKENS } from "@/lib/ai/token-limits";
import type {
  MessageTemplateTone,
  RewriteMessageTemplateInput,
  RewriteMessageTemplateResult,
} from "@/lib/ai/message-template-tone-types";
import {
  MESSAGE_TEMPLATE_REQUIRED_PLACEHOLDERS,
  validateMessageTemplatePlaceholders,
} from "@/lib/orders/message-template-editor";
import { MESSAGE_TEMPLATE_PLACEHOLDERS } from "@/lib/orders/message-templates";

export type {
  MessageTemplateTone,
  RewriteMessageTemplateInput,
  RewriteMessageTemplateResult,
} from "@/lib/ai/message-template-tone-types";

const MAX_TEMPLATE_LENGTH = 900;

function truncateTemplate(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= MAX_TEMPLATE_LENGTH) return trimmed;
  return trimmed.slice(0, MAX_TEMPLATE_LENGTH).trimEnd();
}

function toneLabel(tone: MessageTemplateTone): string {
  switch (tone) {
    case "amigable":
      return "amigable";
    case "profesional":
      return "profesional";
    case "cercano":
      return "cercano";
    default:
      return "profesional";
  }
}

function buildSystemPrompt(): string {
  const tokens = MESSAGE_TEMPLATE_PLACEHOLDERS.join(", ");
  return [
    `Reescribe plantillas WhatsApp. JSON: { "template": string }`,
    `Conserva marcadores exactos: ${tokens}. Español LATAM, sin emojis, máx 800 chars.`,
  ].join(" ");
}

function buildUserPrompt(input: RewriteMessageTemplateInput): string {
  const required = MESSAGE_TEMPLATE_REQUIRED_PLACEHOLDERS[input.templateKey];
  return [
    `Tipo:${input.templateLabel} Tono:${toneLabel(input.tone)}`,
    input.storeName?.trim() ? `Tienda:${input.storeName.trim()}` : null,
    `Obligatorios:${required.join(",")}`,
    input.template.trim(),
  ]
    .filter(Boolean)
    .join(" | ");
}

function parseModelJson(content: string): RewriteMessageTemplateResult {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new Error("La IA devolvió un formato inválido. Intenta de nuevo.");
  }

  const template =
    typeof parsed.template === "string"
      ? parsed.template
      : typeof parsed.message === "string"
        ? parsed.message
        : "";

  if (!template.trim()) {
    throw new Error("La IA no generó una plantilla válida.");
  }

  return { template: truncateTemplate(template) };
}

export async function rewriteMessageTemplate(
  input: RewriteMessageTemplateInput,
): Promise<RewriteMessageTemplateResult> {
  if (!input.template.trim()) {
    throw new Error("La plantilla está vacía.");
  }

  try {
    const content = await createOpenRouterChatCompletion({
      temperature: 0.5,
      max_tokens: AI_MAX_TOKENS.messageTemplate,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(input) },
      ],
    });

    const result = parseModelJson(content);
    const validationError = validateMessageTemplatePlaceholders(
      result.template,
      input.templateKey,
    );
    if (validationError) {
      throw new Error(validationError);
    }

    return result;
  } catch (error) {
    if (error instanceof OpenRouterChatError) {
      throw new Error(error.message);
    }
    throw error;
  }
}
