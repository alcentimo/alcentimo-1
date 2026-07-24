import type { CatalogListItem } from "@/lib/database.types";
import type { CatalogVariantOption } from "@/lib/products/variants";
import { computeUsdToVes, resolveUnitPriceUsd } from "@/lib/catalog/pricing";

export interface CartModifierSelection {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceExtraUsd: number;
}

export interface CartItem {
  product: CatalogListItem;
  quantity: number;
  variantId: string;
  variantName: string;
  unitPriceUsd: number;
  unitPriceVes: number | null;
  availableStock: number;
  wholesaleApplied?: boolean;
  retailUnitUsd?: number;
  modifiers?: CartModifierSelection[];
}

export function modifiersSelectionKey(
  modifiers: CartModifierSelection[] | undefined,
): string {
  if (!modifiers || modifiers.length === 0) return "";
  return [...modifiers]
    .map((row) => `${row.groupId}:${row.optionId}`)
    .sort()
    .join("|");
}

export function cartItemKey(
  productId: string,
  variantId: string,
  modifiers?: CartModifierSelection[],
): string {
  const modsKey = modifiersSelectionKey(modifiers);
  return modsKey
    ? `${productId}:${variantId}:${modsKey}`
    : `${productId}:${variantId}`;
}

export function formatModifiersLabel(
  modifiers: CartModifierSelection[] | undefined,
): string {
  if (!modifiers || modifiers.length === 0) return "";
  return modifiers.map((row) => row.optionName).join(", ");
}

export function sumModifiersExtraUsd(
  modifiers: CartModifierSelection[] | undefined,
): number {
  if (!modifiers || modifiers.length === 0) return 0;
  return modifiers.reduce((sum, row) => sum + (row.priceExtraUsd || 0), 0);
}

export function buildCartItem(
  product: CatalogListItem,
  variant: CatalogVariantOption,
  quantity = 1,
  modifiers: CartModifierSelection[] = [],
): CartItem {
  const modifiersExtra = sumModifiersExtraUsd(modifiers);
  const retailBaseUsd = product.price_usd ?? 0;
  const pricing = resolveUnitPriceUsd({
    retailUsd: retailBaseUsd,
    wholesalePriceUsd: product.wholesale_price_usd,
    wholesaleMinQty: product.wholesale_min_qty,
    quantity,
    priceExtraUsd: variant.priceExtraUsd + modifiersExtra,
  });
  const unitPriceUsd = pricing.unitPriceUsd;
  const modifiersLabel = formatModifiersLabel(modifiers);
  const variantName = modifiersLabel
    ? `${variant.name} · ${modifiersLabel}`
    : variant.name;

  return {
    product,
    quantity,
    variantId: variant.id,
    variantName,
    unitPriceUsd,
    unitPriceVes:
      computeUsdToVes(unitPriceUsd, product.exchange_rate_used) ??
      (variant.priceVes != null && variant.priceUsd > 0
        ? (unitPriceUsd / variant.priceUsd) * variant.priceVes
        : null),
    availableStock: variant.availableStock,
    wholesaleApplied: pricing.wholesaleApplied,
    retailUnitUsd: pricing.retailUnitUsd,
    modifiers: modifiers.length > 0 ? modifiers : undefined,
  };
}
