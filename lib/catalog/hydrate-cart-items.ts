import { getCatalogProducts } from "@/lib/catalog";
import {
  buildCartItem,
  type CartItem,
} from "@/lib/catalog/cart-types";
import type { CartLineInput } from "@/lib/catalog/cart-lines";
import { getCatalogVariantOptions } from "@/lib/products/variants";

export async function hydrateCartLines(
  storeSlug: string,
  lines: CartLineInput[],
): Promise<CartItem[]> {
  if (lines.length === 0) return [];

  const { products, exchangeRate } = await getCatalogProducts({
    storeSlug,
    limit: 500,
  });
  const exchangeRateValue = exchangeRate?.rate ?? null;
  const productMap = new Map(products.map((product) => [product.product_id, product]));
  const hydrated: CartItem[] = [];

  for (const line of lines) {
    const product = productMap.get(line.productId);
    if (!product) continue;

    const variant = getCatalogVariantOptions(product, exchangeRateValue).find(
      (option) => option.id === line.variantId,
    );
    if (!variant || variant.availableStock <= 0) continue;

    const quantity = Math.min(
      Math.max(1, Math.floor(line.quantity)),
      variant.availableStock,
    );
    hydrated.push(buildCartItem(product, variant, quantity));
  }

  return hydrated;
}
