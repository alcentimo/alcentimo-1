import type { VariantFormInput } from "@/lib/products/variants";
import { ALIMENTOS_ATTR_PORCION } from "@/lib/rubros/modules/alimentos/config";

export function getPortionAttribute(
  variant: VariantFormInput,
): string | null {
  const fromAttrs = variant.attributes?.[ALIMENTOS_ATTR_PORCION]?.trim();
  if (fromAttrs) return fromAttrs;
  const name = variant.name.trim();
  return name.length > 0 ? name : null;
}

export function looksLikeFoodPortionVariants(
  variants: VariantFormInput[],
): boolean {
  if (variants.length === 0) return false;
  return variants.every((variant) => getPortionAttribute(variant) != null);
}

export interface FoodPortionsState {
  portions: string[];
  stocks: Record<string, string>;
  priceExtras: Record<string, string>;
  ids: Record<string, string | undefined>;
}

export function emptyFoodPortions(): FoodPortionsState {
  return { portions: [], stocks: {}, priceExtras: {}, ids: {} };
}

export function createDefaultFoodPortions(): FoodPortionsState {
  const portions = ["Personal", "Mediana", "Grande"];
  const stocks: Record<string, string> = {};
  const priceExtras: Record<string, string> = {};

  for (const portion of portions) {
    const key = portionKey(portion);
    stocks[key] = "0";
    priceExtras[key] = "0";
  }

  return { portions, stocks, priceExtras, ids: {} };
}

export function portionKey(portion: string): string {
  return portion.trim().toLowerCase();
}

export function variantsToFoodPortions(
  variants: VariantFormInput[],
): FoodPortionsState {
  const portions: string[] = [];
  const seen = new Set<string>();
  const stocks: Record<string, string> = {};
  const priceExtras: Record<string, string> = {};
  const ids: Record<string, string | undefined> = {};

  for (const variant of variants) {
    const portion = getPortionAttribute(variant);
    if (!portion) continue;
    const key = portionKey(portion);
    if (!seen.has(key)) {
      seen.add(key);
      portions.push(portion);
    }
    stocks[key] = variant.stock;
    priceExtras[key] = variant.priceExtraUsd || "0";
    ids[key] = variant.id;
  }

  return { portions, stocks, priceExtras, ids };
}

export function foodPortionsToVariants(
  state: FoodPortionsState,
): VariantFormInput[] {
  return state.portions
    .map((portion) => {
      const key = portionKey(portion);
      const stock = state.stocks[key] ?? "0";
      const priceExtraUsd = state.priceExtras[key] ?? "0";
      return {
        id: state.ids[key],
        name: portion.trim(),
        stock,
        priceExtraUsd,
        attributes: { [ALIMENTOS_ATTR_PORCION]: portion.trim() },
      } satisfies VariantFormInput;
    })
    .filter((row) => row.name.length > 0);
}
