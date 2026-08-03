import {
  createOpenRouterChatCompletion,
  OpenRouterChatError,
} from "@/lib/ai/openrouter-client";
import { AI_MAX_INPUT_CHARS, AI_MAX_TOKENS } from "@/lib/ai/token-limits";
import {
  CATALOG_FAQ_ANSWER_MAX,
  CATALOG_FAQ_QUESTION_MAX,
} from "@/lib/store-settings/catalog-faq";

const MIN_ITEMS = 3;
const MAX_ITEMS = 4;

export interface GenerateCatalogFaqInput {
  storeName: string;
  storeRubro?: string | null;
  storeDescription?: string | null;
  city?: string | null;
  address?: string | null;
  paymentLabels: string[];
  shippingLabels: string[];
  categoryLabels: string[];
  productNames: string[];
}

export interface GeneratedCatalogFaqItem {
  question: string;
  answer: string;
}

export interface GenerateCatalogFaqResult {
  items: GeneratedCatalogFaqItem[];
}

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trimEnd();
}

function buildSystemPrompt(): string {
  return [
    "Eres un asistente de e-commerce para Venezuela (LATAM).",
    'Genera preguntas frecuentes para el catálogo público de una tienda. JSON: { "items": [ { "question": string, "answer": string } ] }',
    `Devuelve exactamente ${MIN_ITEMS} o ${MAX_ITEMS} ítems.`,
    `Pregunta máx ${CATALOG_FAQ_QUESTION_MAX} caracteres; respuesta máx ${CATALOG_FAQ_ANSWER_MAX} caracteres.`,
    "Español claro y comercial. Sin emojis ni hashtags.",
    "Cubre temas útiles: envíos/retiros, pagos, tiempos, cambios o cómo comprar.",
    "Usa solo la información del contexto. Si falta un dato (ej. tiempo exacto), da una respuesta razonable y genérica sin inventar números de teléfono ni precios.",
    "No inventes políticas legales agresivas; tono amable y práctico.",
  ].join(" ");
}

function buildUserPrompt(input: GenerateCatalogFaqInput): string {
  const parts = [
    `Tienda:"${truncate(input.storeName, AI_MAX_INPUT_CHARS.storeName)}"`,
  ];

  if (input.storeRubro?.trim()) {
    parts.push(`Rubro:${input.storeRubro.trim()}`);
  }

  if (input.storeDescription?.trim()) {
    parts.push(
      `Descripción:"${truncate(input.storeDescription, AI_MAX_INPUT_CHARS.storeDescriptionDraft)}"`,
    );
  }

  if (input.city?.trim() || input.address?.trim()) {
    parts.push(
      `Ubicación:${[input.city?.trim(), input.address?.trim()].filter(Boolean).join(" — ")}`,
    );
  }

  if (input.paymentLabels.length > 0) {
    parts.push(`Pagos:${input.paymentLabels.slice(0, 8).join(", ")}`);
  }

  if (input.shippingLabels.length > 0) {
    parts.push(`Envíos:${input.shippingLabels.slice(0, 8).join(", ")}`);
  }

  if (input.categoryLabels.length > 0) {
    parts.push(`Categorías:${input.categoryLabels.slice(0, 10).join(", ")}`);
  }

  if (input.productNames.length > 0) {
    parts.push(
      `Productos ejemplo:${input.productNames
        .slice(0, 8)
        .map((name) => truncate(name, 60))
        .join(" · ")}`,
    );
  }

  parts.push(
    `Genera ${MIN_ITEMS}-${MAX_ITEMS} FAQ adaptadas a este negocio venezolano.`,
  );

  return parts.join(" | ");
}

function parseModelJson(content: string): GenerateCatalogFaqResult {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new Error("La IA devolvió un formato inválido. Intenta de nuevo.");
  }

  const rawItems = Array.isArray(parsed.items)
    ? parsed.items
    : Array.isArray(parsed.faqs)
      ? parsed.faqs
      : Array.isArray(parsed.questions)
        ? parsed.questions
        : [];

  const items: GeneratedCatalogFaqItem[] = [];

  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const question =
      typeof row.question === "string"
        ? row.question.trim().slice(0, CATALOG_FAQ_QUESTION_MAX)
        : typeof row.q === "string"
          ? row.q.trim().slice(0, CATALOG_FAQ_QUESTION_MAX)
          : "";
    const answer =
      typeof row.answer === "string"
        ? row.answer.trim().slice(0, CATALOG_FAQ_ANSWER_MAX)
        : typeof row.a === "string"
          ? row.a.trim().slice(0, CATALOG_FAQ_ANSWER_MAX)
          : "";
    if (!question || !answer) continue;
    items.push({ question, answer });
    if (items.length >= MAX_ITEMS) break;
  }

  if (items.length < MIN_ITEMS) {
    throw new Error(
      "La IA no generó suficientes preguntas. Intenta de nuevo.",
    );
  }

  return { items };
}

/** Sugiere 3–4 FAQ del catálogo según el contexto de la tienda. */
export async function generateCatalogFaq(
  input: GenerateCatalogFaqInput,
): Promise<GenerateCatalogFaqResult> {
  const storeName = input.storeName?.trim() ?? "";
  if (storeName.length < 2) {
    throw new Error("La tienda necesita un nombre para generar preguntas.");
  }

  try {
    const content = await createOpenRouterChatCompletion({
      temperature: 0.55,
      max_tokens: AI_MAX_TOKENS.catalogFaq,
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
