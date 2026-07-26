import {
  createOpenRouterChatCompletion,
  OpenRouterChatError,
} from "@/lib/ai/openrouter-client";
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

const MAX_TEMPLATE_LENGTH = 1200;

function truncateTemplate(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= MAX_TEMPLATE_LENGTH) return trimmed;
  return trimmed.slice(0, MAX_TEMPLATE_LENGTH).trimEnd();
}

function toneInstruction(tone: MessageTemplateTone): string {
  switch (tone) {
    case "amigable":
      return "Tono amigable y cercano, claro para WhatsApp, sin ser informal en exceso.";
    case "profesional":
      return "Tono profesional y confiable, cortés y preciso, apto para negocios.";
    case "cercano":
      return "Tono cercano y humano, como un comerciante que conoce a su cliente.";
    default:
      return "Tono profesional y claro.";
  }
}

function buildSystemPrompt(): string {
  const tokens = MESSAGE_TEMPLATE_PLACEHOLDERS.join(", ");
  return [
    "Eres un experto en comunicación comercial por WhatsApp para comerciantes latinoamericanos.",
    "Reescribes plantillas de mensajes de pedidos manteniendo la funcionalidad del sistema.",
    "Responde ÚNICAMENTE con JSON válido (sin markdown): { \"template\": string }",
    "Reglas estrictas:",
    `- Conserva EXACTAMENTE estos marcadores sin traducir ni renombrar: ${tokens}.`,
    "- No elimines ni dupliques marcadores. No uses llaves simples ni otros formatos.",
    "- Español neutro latinoamericano. Sin emojis. Máximo 900 caracteres.",
    "- Mantén saltos de línea útiles para leer en WhatsApp.",
    "- No inventes datos de pedido; solo redacta el texto alrededor de los marcadores.",
  ].join("\n");
}

function buildUserPrompt(input: RewriteMessageTemplateInput): string {
  const required = MESSAGE_TEMPLATE_REQUIRED_PLACEHOLDERS[input.templateKey];
  return [
    `Tipo de mensaje: ${input.templateLabel}.`,
    `Tono deseado: ${toneInstruction(input.tone)}`,
    input.storeName?.trim()
      ? `Nombre de la tienda (contexto): ${input.storeName.trim()}.`
      : null,
    `Marcadores obligatorios en la respuesta: ${required.join(", ")}.`,
    "Plantilla actual:",
    input.template.trim(),
  ]
    .filter(Boolean)
    .join("\n");
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
      temperature: 0.55,
      max_tokens: 500,
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
