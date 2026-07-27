import type { CartItem } from "@/lib/catalog/cart-types";
import { cartItemKey } from "@/lib/catalog/cart-types";
import type { SubmitOrderLineInput } from "@/lib/orders/types";

function normalizeCartLineId(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Convierte ítems del carrito en líneas de pedido omitiendo entradas inválidas. */
export function buildSubmitOrderLinesFromCartItems(
  items: CartItem[],
): SubmitOrderLineInput[] {
  return items
    .map((item) => {
      const productId = normalizeCartLineId(item.product?.product_id);
      const variantId = normalizeCartLineId(
        item.variantId || item.product?.default_variant_id,
      );
      const quantity = Math.max(1, Math.floor(item.quantity ?? 0));

      return {
        productId,
        variantId,
        productName: item.product?.product_name?.trim() || "Producto",
        variantName: item.variantName?.trim() || "Estándar",
        quantity,
        unitPriceUsd: item.unitPriceUsd ?? 0,
        wholesaleApplied: item.wholesaleApplied,
      };
    })
    .filter(
      (line) =>
        line.productId.length > 0 &&
        line.variantId.length > 0 &&
        line.quantity > 0,
    );
}

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
