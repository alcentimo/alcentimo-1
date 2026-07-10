import type { CatalogListItem } from "@/lib/database.types";
import type { CatalogVariantOption } from "@/lib/products/variants";

export interface CartItem {
  product: CatalogListItem;
  quantity: number;
  variantId: string;
  variantName: string;
  unitPriceUsd: number;
  unitPriceVes: number | null;
  availableStock: number;
}

export function cartItemKey(productId: string, variantId: string): string {
  return `${productId}:${variantId}`;
}

export function buildCartItem(
  product: CatalogListItem,
  variant: CatalogVariantOption,
  quantity = 1,
): CartItem {
  return {
    product,
    quantity,
    variantId: variant.id,
    variantName: variant.name,
    unitPriceUsd: variant.priceUsd,
    unitPriceVes: variant.priceVes,
    availableStock: variant.availableStock,
  };
}
