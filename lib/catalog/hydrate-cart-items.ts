import { getCatalogProducts } from "@/lib/catalog";
import {
  buildCartItem,
  type CartItem,
  type CartModifierSelection,
} from "@/lib/catalog/cart-types";
import type { CartLineInput } from "@/lib/catalog/cart-lines";
import { getCatalogVariantOptions } from "@/lib/products/variants";

function sanitizeModifiers(
  modifiers: CartModifierSelection[] | undefined,
): CartModifierSelection[] {
  if (!Array.isArray(modifiers) || modifiers.length === 0) return [];
  return modifiers
    .filter(
      (row) =>
        row &&
        typeof row.groupId === "string" &&
        typeof row.optionId === "string" &&
        row.groupId.trim() &&
        row.optionId.trim(),
    )
    .map((row) => ({
      groupId: row.groupId.trim(),
      groupName: String(row.groupName ?? "").trim() || "Extra",
      optionId: row.optionId.trim(),
      optionName: String(row.optionName ?? "").trim() || "Opción",
      priceExtraUsd: Math.max(0, Number(row.priceExtraUsd) || 0),
    }));
}

export async function hydrateCartLines(
  storeSlug: string,
  lines: CartLineInput[],
): Promise<CartItem[]> {
  if (lines.length === 0) return [];

  const productIds = [...new Set(lines.map((line) => line.productId))];
  const { products, exchangeRate } = await getCatalogProducts({
    storeSlug,
    productIds,
    limit: productIds.length,
  });
  const exchangeRateValue = exchangeRate?.rate ?? null;
  const productMap = new Map(products.map((product) => [product.product_id, product]));
  const hydrated: CartItem[] = [];
  const qtyByVariant = new Map<string, number>();

  for (const line of lines) {
    const product = productMap.get(line.productId);
    if (!product) continue;

    const variantOptions = getCatalogVariantOptions(product, exchangeRateValue);
    const variant =
      variantOptions.find((option) => option.id === line.variantId) ??
      variantOptions.find(
        (option) => option.id === product.default_variant_id,
      ) ??
      variantOptions[0];

    if (!variant || variant.availableStock <= 0) continue;

    const variantKey = `${product.product_id}:${variant.id}`;
    const usedQty = qtyByVariant.get(variantKey) ?? 0;
    const remaining = Math.max(0, variant.availableStock - usedQty);
    if (remaining <= 0) continue;

    const quantity = Math.min(
      Math.max(1, Math.floor(line.quantity)),
      remaining,
    );
    qtyByVariant.set(variantKey, usedQty + quantity);

    hydrated.push(
      buildCartItem(
        product,
        variant,
        quantity,
        sanitizeModifiers(line.modifiers),
      ),
    );
  }

  return hydrated;
}
