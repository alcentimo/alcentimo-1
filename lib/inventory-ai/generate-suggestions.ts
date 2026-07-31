import { createOpenRouterChatCompletion } from "@/lib/ai/openrouter-client";
import { AI_MAX_TOKENS } from "@/lib/ai/token-limits";
import {
  STAGNANT_HARD_DAYS,
  type InventorySuggestionPayload,
  type InventorySuggestionType,
  type StagnantProductCandidate,
} from "@/lib/inventory-ai/types";

export interface GeneratedInventorySuggestion {
  productId: string;
  suggestionType: InventorySuggestionType;
  title: string;
  rationale: string;
  actionPayload: InventorySuggestionPayload;
}

function clampDiscount(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(40, Math.max(5, Math.round(n)));
}

function buildFallbackSuggestion(
  product: StagnantProductCandidate,
): GeneratedInventorySuggestion {
  const price = product.priceUsd ?? 0;
  const isHard = product.daysWithoutSale >= STAGNANT_HARD_DAYS;
  const discountPercent = isHard ? 20 : 15;

  if (price > 0) {
    const suggestedPriceUsd = Math.max(
      0.01,
      Math.round(price * (1 - discountPercent / 100) * 100) / 100,
    );
    return {
      productId: product.productId,
      suggestionType: "discount_offer",
      title: `Oferta ${discountPercent}% en ${product.productName}`,
      rationale: isHard
        ? `Lleva ${product.daysWithoutSale} días sin movimiento y tienes ${product.availableStock} uds. Un descuento estratégico puede liberar capital.`
        : `Sin ventas en ${product.daysWithoutSale} días. Una oferta temporal puede reactivar la demanda.`,
      actionPayload: {
        discountPercent,
        currentPriceUsd: price,
        suggestedPriceUsd,
        compareAtUsd: price,
      },
    };
  }

  if (!product.isFeatured) {
    return {
      productId: product.productId,
      suggestionType: "feature",
      title: `Destacar ${product.productName} en el catálogo`,
      rationale: `Sin ventas en ${product.daysWithoutSale} días. Destacarlo aumenta la visibilidad sin bajar el precio.`,
      actionPayload: { setFeatured: true },
    };
  }

  return {
    productId: product.productId,
    suggestionType: "review_price",
    title: `Revisar precio de ${product.productName}`,
    rationale: `Producto estancado ${product.daysWithoutSale} días. Revisa el precio o crea una promoción manual.`,
    actionPayload: {
      discountPercent: 10,
      currentPriceUsd: 0,
      suggestedPriceUsd: 0,
      compareAtUsd: 0,
    },
  };
}

function parseAiSuggestions(
  raw: string,
  products: StagnantProductCandidate[],
): GeneratedInventorySuggestion[] {
  const byId = new Map(products.map((p) => [p.productId, p]));
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return products.map(buildFallbackSuggestion);
  }

  const list =
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as { suggestions?: unknown }).suggestions)
      ? (parsed as { suggestions: unknown[] }).suggestions
      : Array.isArray(parsed)
        ? parsed
        : null;

  if (!list) return products.map(buildFallbackSuggestion);

  const out: GeneratedInventorySuggestion[] = [];

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const productId = String(row.productId ?? "");
    const product = byId.get(productId);
    if (!product) continue;

    const typeRaw = String(row.suggestionType ?? "discount_offer");
    const suggestionType: InventorySuggestionType =
      typeRaw === "feature" ||
      typeRaw === "review_price" ||
      typeRaw === "discount_offer"
        ? typeRaw
        : "discount_offer";

    const title =
      typeof row.title === "string" && row.title.trim()
        ? row.title.trim().slice(0, 120)
        : buildFallbackSuggestion(product).title;
    const rationale =
      typeof row.rationale === "string" && row.rationale.trim()
        ? row.rationale.trim().slice(0, 320)
        : buildFallbackSuggestion(product).rationale;

    if (suggestionType === "feature") {
      out.push({
        productId,
        suggestionType,
        title,
        rationale,
        actionPayload: { setFeatured: true },
      });
      continue;
    }

    const price = product.priceUsd ?? 0;
    if (price <= 0) {
      out.push(buildFallbackSuggestion(product));
      continue;
    }

    const discountPercent = clampDiscount(row.discountPercent, 15);
    const suggestedPriceUsd = Math.max(
      0.01,
      Math.round(price * (1 - discountPercent / 100) * 100) / 100,
    );

    out.push({
      productId,
      suggestionType:
        suggestionType === "review_price" ? "review_price" : "discount_offer",
      title,
      rationale,
      actionPayload: {
        discountPercent,
        currentPriceUsd: price,
        suggestedPriceUsd,
        compareAtUsd: price,
      },
    });
  }

  if (out.length === 0) {
    return products.map(buildFallbackSuggestion);
  }

  return out;
}

/** Genera sugerencias comerciales con gpt-4o-mini (vía OpenRouter). */
export async function generateInventorySuggestionsWithAi(input: {
  storeName: string;
  products: StagnantProductCandidate[];
}): Promise<GeneratedInventorySuggestion[]> {
  if (input.products.length === 0) return [];

  const catalog = input.products.map((p) => ({
    productId: p.productId,
    name: p.productName,
    daysWithoutSale: p.daysWithoutSale,
    stock: p.availableStock,
    priceUsd: p.priceUsd,
    isFeatured: p.isFeatured,
    hardStagnant: p.daysWithoutSale >= STAGNANT_HARD_DAYS,
  }));

  try {
    const raw = await createOpenRouterChatCompletion({
      temperature: 0.4,
      max_tokens: AI_MAX_TOKENS.inventorySuggestions,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Eres un asesor comercial para tiendas en Venezuela (Alcéntimo).
Responde SOLO JSON válido:
{"suggestions":[{"productId":"...","suggestionType":"discount_offer"|"feature"|"review_price","title":"...","rationale":"...","discountPercent":15}]}
Reglas:
- Español claro y breve (title ≤ 80 chars, rationale ≤ 2 frases).
- Preferir discount_offer si hay precio > 0 (descuento 10–25%).
- Usar feature solo si no está destacado y no conviene bajar precio.
- No inventes productId: usa solo los del listado.
- Un objeto por producto del listado.`,
        },
        {
          role: "user",
          content: `Tienda: ${input.storeName}
Productos estancados (≥30 días sin ventas):
${JSON.stringify(catalog)}`,
        },
      ],
    });

    return parseAiSuggestions(raw, input.products);
  } catch {
    return input.products.map(buildFallbackSuggestion);
  }
}
