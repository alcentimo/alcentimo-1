import type { CartItem } from "@/lib/catalog/cart-types";
import { cartItemKey } from "@/lib/catalog/cart-types";

export interface CartLineInput {
  productId: string;
  variantId: string;
  quantity: number;
}

export function cartItemsToLines(items: CartItem[]): CartLineInput[] {
  return items.map((item) => ({
    productId: item.product.product_id,
    variantId: item.variantId,
    quantity: item.quantity,
  }));
}

export function mergeCartLines(
  base: CartLineInput[],
  incoming: CartLineInput[],
): CartLineInput[] {
  const map = new Map<string, CartLineInput>();

  for (const line of base) {
    if (line.quantity <= 0) continue;
    const key = cartItemKey(line.productId, line.variantId);
    map.set(key, { ...line });
  }

  for (const line of incoming) {
    if (line.quantity <= 0) continue;
    const key = cartItemKey(line.productId, line.variantId);
    const existing = map.get(key);
    if (existing) {
      map.set(key, {
        ...existing,
        quantity: existing.quantity + line.quantity,
      });
    } else {
      map.set(key, { ...line });
    }
  }

  return Array.from(map.values());
}
