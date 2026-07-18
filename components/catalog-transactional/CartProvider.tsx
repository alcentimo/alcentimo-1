"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CatalogListItem } from "@/lib/database.types";
import {
  buildCartItem,
  cartItemKey,
  type CartItem,
} from "@/lib/catalog/cart-types";
import { cartItemsToLines } from "@/lib/catalog/cart-lines";
import {
  clearStoredCart,
  readStoredCart,
  writeStoredCart,
} from "@/lib/catalog/cart-storage";
import type { CatalogVariantOption } from "@/lib/products/variants";
import {
  clearCustomerCart,
  getCustomerCart,
  mergeGuestCart,
  syncCustomerCart,
} from "@/lib/customers/cart-actions";
import { createClient } from "@/lib/supabase/client";

interface CartProviderProps {
  storeSlug: string;
  storeId: string | null;
  userId: string | null;
  isCustomer: boolean;
  children: ReactNode;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotalUsd: number;
  isSyncing: boolean;
  addItem: (product: CatalogListItem, variant: CatalogVariantOption) => void;
  removeItem: (productId: string, variantId: string) => void;
  updateQuantity: (productId: string, variantId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const SYNC_DEBOUNCE_MS = 400;

type PersistMode = "guest" | "customer";

export function CartProvider({
  storeSlug,
  storeId,
  userId,
  isCustomer,
  children,
}: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [persistMode, setPersistMode] = useState<PersistMode>(
    isCustomer && userId && storeId ? "customer" : "guest",
  );

  const syncPausedRef = useRef(false);
  const persistModeRef = useRef<PersistMode>(persistMode);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    persistModeRef.current = persistMode;
  }, [persistMode]);

  const loadCustomerCartState = useCallback(async () => {
    const guestItems = readStoredCart(storeSlug);
    const guestLines = cartItemsToLines(guestItems);

    if (guestLines.length > 0) {
      const merged = await mergeGuestCart(storeSlug, guestLines);
      if (merged.ok) {
        clearStoredCart(storeSlug);
        return { items: merged.items, isCustomer: true as const };
      }
    }

    const loaded = await getCustomerCart(storeSlug);
    if (loaded.ok) {
      return { items: loaded.items, isCustomer: true as const };
    }

    return {
      items: guestItems,
      isCustomer: false as const,
    };
  }, [storeSlug]);

  const bootstrapCustomerSession = useCallback(async () => {
    syncPausedRef.current = true;
    setIsSyncing(true);

    try {
      const { items: nextItems, isCustomer: canPersist } =
        await loadCustomerCartState();
      setItems(nextItems);
      setPersistMode(canPersist ? "customer" : "guest");
      if (!canPersist && nextItems.length > 0) {
        writeStoredCart(storeSlug, nextItems);
      }
    } finally {
      syncPausedRef.current = false;
      setIsSyncing(false);
    }
  }, [loadCustomerCartState, storeSlug]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      syncPausedRef.current = true;
      setIsSyncing(true);

      try {
        if (isCustomer && userId && storeId) {
          const { items: nextItems, isCustomer: canPersist } =
            await loadCustomerCartState();
          if (!cancelled) {
            setItems(nextItems);
            setPersistMode(canPersist ? "customer" : "guest");
          }
        } else if (!cancelled) {
          setItems(readStoredCart(storeSlug));
          setPersistMode("guest");
        }
      } finally {
        syncPausedRef.current = false;
        setIsSyncing(false);
        if (!cancelled) {
          setHydrated(true);
        }
      }
    }

    setHydrated(false);
    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [storeSlug, storeId, userId, isCustomer, loadCustomerCartState]);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        syncPausedRef.current = true;
        setPersistMode("guest");
        setItems(readStoredCart(storeSlug));
        syncPausedRef.current = false;
        return;
      }

      if (event === "SIGNED_IN") {
        void bootstrapCustomerSession();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [storeSlug, bootstrapCustomerSession]);

  useEffect(() => {
    if (!hydrated || syncPausedRef.current || persistMode !== "guest") return;
    writeStoredCart(storeSlug, items);
  }, [storeSlug, items, hydrated, persistMode]);

  useEffect(() => {
    if (!hydrated || syncPausedRef.current || persistMode !== "customer") {
      return;
    }

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = setTimeout(() => {
      void (async () => {
        setIsSyncing(true);
        const result = await syncCustomerCart(storeSlug, cartItemsToLines(items));
        if (result.ok) {
          setItems((current) => {
            const currentKeys = new Set(
              current.map((item) =>
                cartItemKey(item.product.product_id, item.variantId),
              ),
            );
            const nextKeys = new Set(
              result.items.map((item) =>
                cartItemKey(item.product.product_id, item.variantId),
              ),
            );

            if (
              current.length === result.items.length &&
              currentKeys.size === nextKeys.size &&
              [...currentKeys].every((key) => nextKeys.has(key))
            ) {
              return current;
            }

            return result.items;
          });
        }
        setIsSyncing(false);
      })();
    }, SYNC_DEBOUNCE_MS);

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, [storeSlug, items, hydrated, persistMode]);

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
    clearStoredCart(storeSlug);

    if (persistModeRef.current === "customer") {
      void clearCustomerCart(storeSlug);
    }
  }, [storeSlug]);

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
      isSyncing,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    };
  }, [items, isSyncing, addItem, removeItem, updateQuantity, clearCart]);

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
