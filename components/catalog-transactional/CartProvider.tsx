"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CatalogListItem } from "@/lib/database.types";
import {
  buildCartItem,
  cartItemKey,
  type CartItem,
} from "@/lib/catalog/cart-types";
import type { CatalogVariantOption } from "@/lib/products/variants";

interface CartProviderProps {
  storeSlug: string;
  children: ReactNode;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotalUsd: number;
  addItem: (product: CatalogListItem, variant: CatalogVariantOption) => void;
  removeItem: (productId: string, variantId: string) => void;
  updateQuantity: (productId: string, variantId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function storageKey(storeSlug: string): string {
  return `alcentimo-cart-${storeSlug}`;
}

function readStoredCart(storeSlug: string): CartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(storageKey(storeSlug));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredCart(storeSlug: string, items: CartItem[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(storeSlug), JSON.stringify(items));
}

export function CartProvider({ storeSlug, children }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readStoredCart(storeSlug));
    setHydrated(true);
  }, [storeSlug]);

  useEffect(() => {
    if (!hydrated) return;
    writeStoredCart(storeSlug, items);
  }, [storeSlug, items, hydrated]);

  const addItem = useCallback(
    (product: CatalogListItem, variant: CatalogVariantOption) => {
      setItems((current) => {
        const key = cartItemKey(product.product_id, variant.id);
        const existing = current.find(
          (item) => cartItemKey(item.product.product_id, item.variantId) === key,
        );

        if (existing) {
          const nextQty = Math.min(
            existing.quantity + 1,
            existing.availableStock,
          );
          return current.map((item) =>
            cartItemKey(item.product.product_id, item.variantId) === key
              ? { ...item, quantity: nextQty }
              : item,
          );
        }

        return [...current, buildCartItem(product, variant, 1)];
      });
    },
    [],
  );

  const removeItem = useCallback((productId: string, variantId: string) => {
    const key = cartItemKey(productId, variantId);
    setItems((current) =>
      current.filter(
        (item) => cartItemKey(item.product.product_id, item.variantId) !== key,
      ),
    );
  }, []);

  const updateQuantity = useCallback(
    (productId: string, variantId: string, quantity: number) => {
      const key = cartItemKey(productId, variantId);
      setItems((current) =>
        current
          .map((item) => {
            if (cartItemKey(item.product.product_id, item.variantId) !== key) {
              return item;
            }
            const nextQty = Math.max(
              0,
              Math.min(quantity, item.availableStock),
            );
            return { ...item, quantity: nextQty };
          })
          .filter((item) => item.quantity > 0),
      );
    },
    [],
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotalUsd = items.reduce(
      (sum, item) => sum + item.unitPriceUsd * item.quantity,
      0,
    );

    return {
      items,
      itemCount,
      subtotalUsd,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    };
  }, [items, addItem, removeItem, updateQuantity, clearCart]);

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart debe usarse dentro de CartProvider.");
  }
  return context;
}
