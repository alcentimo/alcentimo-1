import { createOpenRouterChatCompletion } from "@/lib/ai/openrouter-client";
import { AI_MAX_TOKENS } from "@/lib/ai/token-limits";
import {
  compactMarketingContext,
} from "@/lib/marketing-ai/get-marketing-context";
import {
  MARKETING_SUGGESTION_TYPES,
  MAX_MARKETING_SUGGESTIONS_PER_STORE,
  type MarketingAiContext,
  type MarketingSuggestionPayload,
  type MarketingSuggestionType,
} from "@/lib/marketing-ai/types";

export interface GeneratedMarketingSuggestion {
  suggestionType: MarketingSuggestionType;
  title: string;
  rationale: string;
  actionPayload: MarketingSuggestionPayload;
}

function daysFromNowIsoDate(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + Math.max(1, days));
  return d.toISOString().slice(0, 10);
}

function sanitizeCode(raw: unknown, fallback: string): string {
  const value = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 20);
  return value.length >= 3 ? value : fallback;
}

function clampPercent(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(40, Math.max(5, Math.round(n)));
}

function clampFixed(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(50, Math.round(n * 100) / 100);
}

function buildFallbackSuggestions(
  context: MarketingAiContext,
): GeneratedMarketingSuggestion[] {
  const out: GeneratedMarketingSuggestion[] = [];
  const existingCodes = new Set([
    ...context.promotions.activeCoupons.map((c) => c.code),
    ...context.promotions.activeCustomerPromos.map((p) => p.code),
  ]);

  if (context.customers.onePurchaseCount >= 3) {
    const code = existingCodes.has("SEGUNDA10") ? "VUELVE10" : "SEGUNDA10";
    out.push({
      suggestionType: "create_customer_promo",
      title: "Incentivo de segunda compra (10%)",
      rationale: `Hay ${context.customers.onePurchaseCount} clientes con una sola compra. Un 10% exclusivo para registrados puede impulsar la recompra.`,
      actionPayload: {
        name: "Segunda compra",
        code,
        discountPercentage: 10,
        daysValid: 30,
        autoApply: true,
        maxUses: 0,
      },
    });
  }

  const slow = context.inventory.slowMoving[0] ?? context.inventory.excessStock[0];
  if (slow?.productId) {
    out.push({
      suggestionType: "combo_bundle",
      title: `Cupón 15% para reactivar ${slow.name}`,
      rationale: `${slow.name} tiene poca rotación (stock ${slow.availableStock}). Un cupón acotado puede liberar inventario sin bajar el precio de lista.`,
      actionPayload: {
        code: "GIRA15",
        discountPercent: 15,
        maxUses: 50,
        daysValid: 14,
        productIds: [slow.productId],
        productNames: [slow.name],
      },
    });
  } else if (context.sales.averageOrderUsd > 0) {
    out.push({
      suggestionType: "create_percent_coupon",
      title: "Cupón 10% para subir el ticket",
      rationale: `Ticket promedio ~$${context.sales.averageOrderUsd.toFixed(2)}. Un cupón general por tiempo limitado puede reactivar pedidos esta semana.`,
      actionPayload: {
        code: "ALCE10",
        discountPercent: 10,
        maxUses: 100,
        daysValid: 14,
        isGlobal: true,
      },
    });
  }

  if (out.length === 0) {
    out.push({
      suggestionType: "create_percent_coupon",
      title: "Cupón de bienvenida 10%",
      rationale:
        "Aún hay poco historial. Un cupón simple ayuda a medir si los descuentos convierten en tu tienda.",
      actionPayload: {
        code: "HOLA10",
        discountPercent: 10,
        maxUses: 50,
        daysValid: 21,
        isGlobal: true,
      },
    });
  }

  return out.slice(0, MAX_MARKETING_SUGGESTIONS_PER_STORE);
}

function parseAiRecommendations(
  raw: string,
  context: MarketingAiContext,
): GeneratedMarketingSuggestion[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return buildFallbackSuggestions(context);
  }

  const list =
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as { recommendations?: unknown }).recommendations)
      ? (parsed as { recommendations: unknown[] }).recommendations
      : Array.isArray(parsed)
        ? parsed
        : null;

  if (!list || list.length === 0) {
    return buildFallbackSuggestions(context);
  }

  const knownProductIds = new Set(
    [...context.inventory.slowMoving, ...context.inventory.excessStock]
      .map((p) => p.productId)
      .filter((id): id is string => Boolean(id)),
  );

  const out: GeneratedMarketingSuggestion[] = [];

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const type = String(row.type ?? row.suggestionType ?? "");
    if (
      !(MARKETING_SUGGESTION_TYPES as readonly string[]).includes(type)
    ) {
      continue;
    }
    const suggestionType = type as MarketingSuggestionType;
    const title = String(row.title ?? "").trim().slice(0, 120);
    const rationale = String(row.rationale ?? "").trim().slice(0, 320);
    if (!title || !rationale) continue;

    const payloadRaw =
      row.payload && typeof row.payload === "object"
        ? (row.payload as Record<string, unknown>)
        : row;

    if (suggestionType === "create_percent_coupon") {
      out.push({
        suggestionType,
        title,
        rationale,
        actionPayload: {
          code: sanitizeCode(payloadRaw.code, "PROMO10"),
          discountPercent: clampPercent(payloadRaw.discountPercent, 10),
          maxUses: Math.max(0, Math.floor(Number(payloadRaw.maxUses) || 100)),
          daysValid: Math.max(3, Math.min(60, Math.floor(Number(payloadRaw.daysValid) || 14))),
          isGlobal: payloadRaw.isGlobal !== false,
          productIds: Array.isArray(payloadRaw.productIds)
            ? payloadRaw.productIds.map(String).filter((id) => knownProductIds.has(id))
            : [],
        },
      });
      continue;
    }

    if (suggestionType === "create_fixed_coupon") {
      out.push({
        suggestionType,
        title,
        rationale,
        actionPayload: {
          code: sanitizeCode(payloadRaw.code, "AHORRA5"),
          discountFixedUsd: clampFixed(payloadRaw.discountFixedUsd, 5),
          maxUses: Math.max(0, Math.floor(Number(payloadRaw.maxUses) || 50)),
          daysValid: Math.max(3, Math.min(60, Math.floor(Number(payloadRaw.daysValid) || 14))),
          isGlobal: true,
        },
      });
      continue;
    }

    if (suggestionType === "create_customer_promo") {
      out.push({
        suggestionType,
        title,
        rationale,
        actionPayload: {
          name: String(payloadRaw.name ?? title).trim().slice(0, 80) || "Promo clientes",
          code: sanitizeCode(payloadRaw.code, "CLIENTE10"),
          discountPercentage: clampPercent(
            payloadRaw.discountPercentage ?? payloadRaw.discountPercent,
            10,
          ),
          daysValid: Math.max(7, Math.min(60, Math.floor(Number(payloadRaw.daysValid) || 30))),
          autoApply: payloadRaw.autoApply !== false,
          maxUses: Math.max(0, Math.floor(Number(payloadRaw.maxUses) || 0)),
        },
      });
      continue;
    }

    if (suggestionType === "combo_bundle") {
      const productIds = Array.isArray(payloadRaw.productIds)
        ? payloadRaw.productIds.map(String).filter((id) => knownProductIds.has(id))
        : [];
      const fallbackId =
        context.inventory.slowMoving[0]?.productId ||
        context.inventory.excessStock[0]?.productId;
      const ids = productIds.length > 0 ? productIds.slice(0, 6) : fallbackId ? [fallbackId] : [];
      if (ids.length === 0) continue;
      out.push({
        suggestionType,
        title,
        rationale,
        actionPayload: {
          code: sanitizeCode(payloadRaw.code, "COMBO15"),
          discountPercent: clampPercent(payloadRaw.discountPercent, 15),
          maxUses: Math.max(0, Math.floor(Number(payloadRaw.maxUses) || 40)),
          daysValid: Math.max(3, Math.min(45, Math.floor(Number(payloadRaw.daysValid) || 14))),
          productIds: ids,
          productNames: Array.isArray(payloadRaw.productNames)
            ? payloadRaw.productNames.map(String).slice(0, 6)
            : undefined,
        },
      });
    }
  }

  return out.length > 0
    ? out.slice(0, MAX_MARKETING_SUGGESTIONS_PER_STORE)
    : buildFallbackSuggestions(context);
}

export function endDateFromDaysValid(daysValid: number): string {
  return daysFromNowIsoDate(daysValid);
}

export async function generateMarketingRecommendationsWithAi(
  context: MarketingAiContext,
): Promise<GeneratedMarketingSuggestion[]> {
  const fallback = buildFallbackSuggestions(context);

  try {
    const content = await createOpenRouterChatCompletion({
      messages: [
        {
          role: "system",
          content: [
            "Eres el estratega de promociones de Alcéntimo (Venezuela, comercio digital).",
            "Con el contexto de la tienda, propone 2 a 4 recomendaciones accionables de cupones/promos.",
            "Responde SOLO JSON: {\"recommendations\":[{\"type\":\"create_percent_coupon|create_fixed_coupon|create_customer_promo|combo_bundle\",\"title\":\"...\",\"rationale\":\"...\",\"payload\":{...}}]}",
            "Reglas: descuentos 5-40%; códigos cortos A-Z0-9; prioriza recompra, lento movimiento y ticket promedio.",
            "create_customer_promo = exclusivo clientes registrados. combo_bundle = cupón con productIds reales del contexto.",
            "No inventes IDs de producto. No propongas envío gratis todavía.",
          ].join(" "),
        },
        {
          role: "user",
          content: compactMarketingContext(context),
        },
      ],
      temperature: 0.4,
      max_tokens: AI_MAX_TOKENS.marketingRecommendations,
      response_format: { type: "json_object" },
    });

    return parseAiRecommendations(content, context);
  } catch {
    return fallback;
  }
}
