import type { CartItem } from "@/lib/catalog/cart-types";

export function cartStorageKey(storeSlug: string): string {
  return `alcentimo-cart-${storeSlug}`;
}

export function readStoredCart(storeSlug: string): CartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(cartStorageKey(storeSlug));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeStoredCart(storeSlug: string, items: CartItem[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(cartStorageKey(storeSlug), JSON.stringify(items));
}

export function clearStoredCart(storeSlug: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(cartStorageKey(storeSlug));
}
