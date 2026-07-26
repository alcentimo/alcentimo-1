import {
  createOpenRouterChatCompletion,
  OpenRouterChatError,
} from "@/lib/ai/openrouter-client";
import type {
  GenerateAnalyticsInsightInput,
  GenerateAnalyticsInsightResult,
} from "@/lib/ai/analytics-insight-types";
import { formatUsd } from "@/lib/format";

export type {
  GenerateAnalyticsInsightInput,
  GenerateAnalyticsInsightResult,
} from "@/lib/ai/analytics-insight-types";

const MAX_INSIGHT_LENGTH = 700;

function truncateInsight(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= MAX_INSIGHT_LENGTH) return trimmed;
  return trimmed.slice(0, MAX_INSIGHT_LENGTH).trimEnd();
}

function buildSystemPrompt(): string {
  return [
    "Eres un asesor comercial para dueños de pequeños negocios en Latinoamérica.",
    "Explicas métricas de ventas en lenguaje sencillo, sin tecnicismos.",
    'Responde ÚNICAMENTE con JSON válido (sin markdown): { "insight": string }',
    "Reglas estrictas:",
    "- Español neutro latinoamericano. Sin emojis.",
    "- Un párrafo de 3 a 5 oraciones, máximo 450 caracteres.",
    "- Resume cómo va el negocio en el periodo, destaca un logro concreto si existe.",
    "- Cierra con UNA recomendación práctica y accionable (promoción, stock, catálogo, etc.).",
    "- Usa solo los datos proporcionados; no inventes cifras ni eventos.",
    "- Tono cercano, optimista pero honesto.",
  ].join("\n");
}

function buildUserPrompt(input: GenerateAnalyticsInsightInput): string {
  return [
    `Tienda: ${input.storeName.trim() || "la tienda"}.`,
    `Periodo analizado: ${input.periodLabel}.`,
    `Ventas del periodo: ${formatUsd(input.periodSalesUsd)}. ${input.salesChangeDescription}`,
    `Transacciones: ${input.transactionCount}. ${input.transactionsChangeDescription}`,
    `Ticket promedio: ${formatUsd(input.averageOrderValueUsd)}. ${input.averageTicketChangeDescription}`,
    input.busiestDaysDescription,
    input.topProductDescription,
    input.stagnantProductCount > 0
      ? `Productos estancados (sin ventas en 30 días): ${input.stagnantProductCount}.`
      : "Inventario estancado: ninguno detectado.",
    input.conversionRateDescription,
  ].join("\n");
}

function parseModelJson(content: string): GenerateAnalyticsInsightResult {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new Error("La IA devolvió un formato inválido. Intenta de nuevo.");
  }

  const insight =
    typeof parsed.insight === "string"
      ? parsed.insight
      : typeof parsed.message === "string"
        ? parsed.message
        : "";

  if (!insight.trim()) {
    throw new Error("La IA no generó un análisis válido.");
  }

  return { insight: truncateInsight(insight) };
}

export async function generateAnalyticsInsight(
  input: GenerateAnalyticsInsightInput,
): Promise<GenerateAnalyticsInsightResult> {
  try {
    const content = await createOpenRouterChatCompletion({
      temperature: 0.55,
      max_tokens: 280,
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
