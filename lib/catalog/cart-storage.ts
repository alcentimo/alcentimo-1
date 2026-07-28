import type { CartItem } from "@/lib/catalog/cart-types";

export function cartStorageKey(storeSlug: string): string {
  return `alcentimo-cart-${storeSlug}`;
}

/** Descarta entradas corruptas de localStorage que romperían el checkout. */
export function sanitizeCartItems(items: unknown): CartItem[] {
  if (!Array.isArray(items)) return [];

  const sanitized: CartItem[] = [];

  for (const entry of items) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Partial<CartItem>;
    const product = item.product;
    if (!product || typeof product !== "object") continue;

    const productId =
      typeof product.product_id === "string" ? product.product_id.trim() : "";
    const productName =
      typeof product.product_name === "string"
        ? product.product_name.trim()
        : "";
    const variantId =
      typeof item.variantId === "string" ? item.variantId.trim() : "";
    const quantity = Math.floor(Number(item.quantity));

    if (!productId || !productName || quantity <= 0) continue;

    sanitized.push({
      ...(item as CartItem),
      product: {
        ...product,
        product_id: productId,
        product_name: productName,
        default_variant_id:
          typeof product.default_variant_id === "string"
            ? product.default_variant_id
            : variantId,
      },
      variantId:
        variantId ||
        (typeof product.default_variant_id === "string"
          ? product.default_variant_id
          : ""),
      variantName:
        typeof item.variantName === "string" && item.variantName.trim()
          ? item.variantName.trim()
          : "Estándar",
      quantity,
      unitPriceUsd: Number.isFinite(Number(item.unitPriceUsd))
        ? Number(item.unitPriceUsd)
        : 0,
      unitPriceVes:
        item.unitPriceVes == null || !Number.isFinite(Number(item.unitPriceVes))
          ? null
          : Number(item.unitPriceVes),
      availableStock: Math.max(0, Math.floor(Number(item.availableStock) || 0)),
    });
  }

  return sanitized;
}

export function readStoredCart(storeSlug: string): CartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(cartStorageKey(storeSlug));
    if (!raw) return [];
    return sanitizeCartItems(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function writeStoredCart(storeSlug: string, items: CartItem[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    cartStorageKey(storeSlug),
    JSON.stringify(sanitizeCartItems(items)),
  );
}

export function clearStoredCart(storeSlug: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(cartStorageKey(storeSlug));
}
