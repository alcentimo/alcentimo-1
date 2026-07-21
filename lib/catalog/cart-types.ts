import type { CatalogListItem } from "@/lib/database.types";
import type { CatalogVariantOption } from "@/lib/products/variants";

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
  const unitPriceUsd = variant.priceUsd + modifiersExtra;
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
      variant.priceVes != null
        ? variant.priceVes +
          (variant.priceUsd > 0 && variant.priceVes > 0
            ? (modifiersExtra * variant.priceVes) / variant.priceUsd
            : 0)
        : null,
    availableStock: variant.availableStock,
    modifiers: modifiers.length > 0 ? modifiers : undefined,
  };
}
