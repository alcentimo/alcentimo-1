import {
  createOpenRouterChatCompletion,
  OpenRouterChatError,
} from "@/lib/ai/openrouter-client";
import { AI_MAX_TOKENS } from "@/lib/ai/token-limits";
import type {
  GenerateAnalyticsInsightInput,
  GenerateAnalyticsInsightResult,
} from "@/lib/ai/analytics-insight-types";
import { formatUsd } from "@/lib/format";

export type {
  GenerateAnalyticsInsightInput,
  GenerateAnalyticsInsightResult,
} from "@/lib/ai/analytics-insight-types";

const MAX_INSIGHT_LENGTH = 450;

function truncateInsight(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= MAX_INSIGHT_LENGTH) return trimmed;
  return trimmed.slice(0, MAX_INSIGHT_LENGTH).trimEnd();
}

function buildSystemPrompt(): string {
  return [
    'Asesor comercial LATAM. JSON: { "insight": string }',
    "Un párrafo 3-4 oraciones, máx 400 chars. Resume periodo, un logro y 1 recomendación práctica. Sin emojis. Solo datos dados.",
  ].join(" ");
}

function buildUserPrompt(input: GenerateAnalyticsInsightInput): string {
  return [
    `${input.storeName} | ${input.periodLabel}`,
    `Ventas ${formatUsd(input.periodSalesUsd)} (${input.salesChangeDescription})`,
    `Transacciones ${input.transactionCount} (${input.transactionsChangeDescription})`,
    `Ticket ${formatUsd(input.averageOrderValueUsd)} (${input.averageTicketChangeDescription})`,
    input.busiestDaysDescription,
    input.topProductDescription,
    input.stagnantProductCount > 0
      ? `Estancados:${input.stagnantProductCount}`
      : "Estancados:0",
    input.conversionRateDescription,
  ].join(" | ");
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
      temperature: 0.5,
      max_tokens: AI_MAX_TOKENS.analyticsInsight,
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
