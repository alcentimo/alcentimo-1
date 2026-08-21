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
import {
  cartItemsToLines,
  mergeCartItemsPreferLocal,
} from "@/lib/catalog/cart-lines";
import { getCatalogVariantOptions } from "@/lib/products/variants";
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
import { resolveCartStockCap } from "@/lib/inventory/open-stock";

interface CartProviderProps {
  storeSlug: string;
  storeId: string | null;
  userId: string | null;
  isCustomer: boolean;
  wholesaleEnabled?: boolean;
  children: ReactNode;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotalUsd: number;
  isSyncing: boolean;
  addItem: (
    product: CatalogListItem,
    variant: CatalogVariantOption,
    modifiers?: import("@/lib/catalog/cart-types").CartModifierSelection[],
  ) => void;
  removeItem: (
    productId: string,
    variantId: string,
    modifiers?: import("@/lib/catalog/cart-types").CartModifierSelection[],
  ) => void;
  updateQuantity: (
    productId: string,
    variantId: string,
    quantity: number,
    modifiers?: import("@/lib/catalog/cart-types").CartModifierSelection[],
  ) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const SYNC_DEBOUNCE_MS = 400;

function refreshCartItemPricing(
  item: CartItem,
  quantity: number,
  wholesaleEnabled: boolean,
): CartItem {
  const variant = getCatalogVariantOptions(item.product).find(
    (option) => option.id === item.variantId,
  );
  if (!variant) {
    return { ...item, quantity };
  }
  return buildCartItem(
    item.product,
    variant,
    quantity,
    item.modifiers ?? [],
    wholesaleEnabled,
  );
}

type PersistMode = "guest" | "customer";

export function CartProvider({
  storeSlug,
  storeId,
  userId,
  isCustomer,
  wholesaleEnabled = false,
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
  /** Sube en cada mutación local para invalidar syncs/bootstraps obsoletos. */
  const cartRevisionRef = useRef(0);

  const bumpCartRevision = useCallback(() => {
    cartRevisionRef.current += 1;
  }, []);

  useEffect(() => {
    persistModeRef.current = persistMode;
  }, [persistMode]);

  const loadCustomerCartState = useCallback(async () => {
    const guestItems = readStoredCart(storeSlug);
    const guestHasModifiers = guestItems.some(
      (item) => (item.modifiers?.length ?? 0) > 0,
    );
    const guestLines = cartItemsToLines(guestItems);

    // Si el invitado tiene modificadores, conservar el carrito local (la sync remota
    // aún no los modela de forma fiable) y no fusionar contra filas sin extras.
    if (guestHasModifiers && guestItems.length > 0) {
      clearStoredCart(storeSlug);
      return { items: guestItems, isCustomer: true as const };
    }

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

  const applyBootstrappedItems = useCallback(
    (nextItems: CartItem[], revisionAtStart: number) => {
      setItems((current) => {
        if (cartRevisionRef.current !== revisionAtStart) {
          // El usuario agregó/quitó productos mientras cargábamos: no pisar.
          return mergeCartItemsPreferLocal(nextItems, current);
        }
        return nextItems;
      });
    },
    [],
  );

  const bootstrapCustomerSession = useCallback(async () => {
    syncPausedRef.current = true;
    setIsSyncing(true);
    const revisionAtStart = cartRevisionRef.current;

    try {
      const { items: nextItems, isCustomer: canPersist } =
        await loadCustomerCartState();
      applyBootstrappedItems(nextItems, revisionAtStart);
      setPersistMode(canPersist ? "customer" : "guest");
      if (!canPersist && nextItems.length > 0) {
        writeStoredCart(storeSlug, nextItems);
      }
    } finally {
      syncPausedRef.current = false;
      setIsSyncing(false);
    }
  }, [applyBootstrappedItems, loadCustomerCartState, storeSlug]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      syncPausedRef.current = true;
      setIsSyncing(true);
      const revisionAtStart = cartRevisionRef.current;

      try {
        if (isCustomer && userId && storeId) {
          const { items: nextItems, isCustomer: canPersist } =
            await loadCustomerCartState();
          if (!cancelled) {
            applyBootstrappedItems(nextItems, revisionAtStart);
            setPersistMode(canPersist ? "customer" : "guest");
          }
        } else if (!cancelled) {
          applyBootstrappedItems(readStoredCart(storeSlug), revisionAtStart);
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
  }, [
    storeSlug,
    storeId,
    userId,
    isCustomer,
    loadCustomerCartState,
    applyBootstrappedItems,
  ]);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        syncPausedRef.current = true;
        bumpCartRevision();
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
  }, [storeSlug, bootstrapCustomerSession, bumpCartRevision]);

  useEffect(() => {
    if (!hydrated || syncPausedRef.current) return;
    setItems((current) =>
      current.map((item) =>
        refreshCartItemPricing(item, item.quantity, wholesaleEnabled),
      ),
    );
  }, [wholesaleEnabled, hydrated]);

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

    // Snapshot de lo que vamos a persistir. Si el carrito local cambia mientras
    // la sync está en vuelo, descartamos el resultado para no pisar ítems nuevos.
    const linesToSync = cartItemsToLines(items);
    const syncedLinesKey = JSON.stringify(linesToSync);

    syncTimerRef.current = setTimeout(() => {
      void (async () => {
        setIsSyncing(true);
        const result = await syncCustomerCart(storeSlug, linesToSync);

        if (result.ok) {
          setItems((current) => {
            const currentLinesKey = JSON.stringify(cartItemsToLines(current));
            if (currentLinesKey !== syncedLinesKey) {
              // El usuario agregó/quitó productos durante la sync: conservar local.
              return current;
            }

            // La sync remota aún puede colapsar modificadores; no pisar el carrito local.
            const hasModifiers = current.some(
              (item) => (item.modifiers?.length ?? 0) > 0,
            );
            if (hasModifiers) return current;

            const currentKeys = new Set(
              current.map((item) =>
                cartItemKey(
                  item.product.product_id,
                  item.variantId,
                  item.modifiers,
                ),
              ),
            );
            const nextKeys = new Set(
              result.items.map((item) =>
                cartItemKey(
                  item.product.product_id,
                  item.variantId,
                  item.modifiers,
                ),
              ),
            );

            if (
              current.length === result.items.length &&
              currentKeys.size === nextKeys.size &&
              [...currentKeys].every((key) => nextKeys.has(key))
            ) {
              return current;
            }

            // Mismo snapshot local: aplicar hidratación (precios/stock).
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
    (
      product: CatalogListItem,
      variant: CatalogVariantOption,
      modifiers: import("@/lib/catalog/cart-types").CartModifierSelection[] = [],
    ) => {
      bumpCartRevision();
      setItems((current) => {
        const key = cartItemKey(product.product_id, variant.id, modifiers);
        const existing = current.find(
          (item) =>
            cartItemKey(
              item.product.product_id,
              item.variantId,
              item.modifiers,
            ) === key,
        );

        const qtyForVariant = current
          .filter(
            (item) =>
              item.product.product_id === product.product_id &&
              item.variantId === variant.id,
          )
          .reduce((sum, item) => sum + item.quantity, 0);
        const stockCap = resolveCartStockCap(
          existing?.availableStock ?? variant.availableStock,
        );
        const remainingForVariant = Math.max(0, stockCap - qtyForVariant);

        if (existing) {
          if (remainingForVariant <= 0) return current;
          const nextQty = existing.quantity + 1;
          return current.map((item) =>
            cartItemKey(
              item.product.product_id,
              item.variantId,
              item.modifiers,
            ) === key
              ? refreshCartItemPricing(item, nextQty, wholesaleEnabled)
              : item,
          );
        }

        if (remainingForVariant <= 0 || stockCap <= 0) {
          return current;
        }

        // Append inmutable: nunca reemplazar el carrito completo.
        return [
          ...current,
          buildCartItem(product, variant, 1, modifiers, wholesaleEnabled),
        ];
      });
    },
    [bumpCartRevision, wholesaleEnabled],
  );

  const removeItem = useCallback(
    (
      productId: string,
      variantId: string,
      modifiers?: import("@/lib/catalog/cart-types").CartModifierSelection[],
    ) => {
      bumpCartRevision();
      const key = cartItemKey(productId, variantId, modifiers);
      setItems((current) =>
        current.filter(
          (item) =>
            cartItemKey(
              item.product.product_id,
              item.variantId,
              item.modifiers,
            ) !== key,
        ),
      );
    },
    [bumpCartRevision],
  );

  const updateQuantity = useCallback(
    (
      productId: string,
      variantId: string,
      quantity: number,
      modifiers?: import("@/lib/catalog/cart-types").CartModifierSelection[],
    ) => {
      bumpCartRevision();
      const key = cartItemKey(productId, variantId, modifiers);
      setItems((current) =>
        current
          .map((item) => {
            if (
              cartItemKey(
                item.product.product_id,
                item.variantId,
                item.modifiers,
              ) !== key
            ) {
              return item;
            }

            const otherQty = current
              .filter(
                (row) =>
                  row.product.product_id === productId &&
                  row.variantId === variantId &&
                  cartItemKey(
                    row.product.product_id,
                    row.variantId,
                    row.modifiers,
                  ) !== key,
              )
              .reduce((sum, row) => sum + row.quantity, 0);
            const stockCap = resolveCartStockCap(
              Number(item.availableStock) || 0,
            );
            const maxForLine = Math.max(0, stockCap - otherQty);

            // Cantidad 0 o menos → eliminar línea.
            if (quantity <= 0) {
              return refreshCartItemPricing(item, 0, wholesaleEnabled);
            }

            // No subir por encima del stock; si el stock llegó a 0, no borrar al
            // intentar (+), solo impedir el aumento.
            const nextQty =
              maxForLine > 0
                ? Math.min(quantity, maxForLine)
                : Math.min(quantity, item.quantity);

            return refreshCartItemPricing(item, nextQty, wholesaleEnabled);
          })
          .filter((item) => item.quantity > 0),
      );
    },
    [bumpCartRevision, wholesaleEnabled],
  );

  const clearCart = useCallback(() => {
    bumpCartRevision();
    setItems([]);
    clearStoredCart(storeSlug);

    if (persistModeRef.current === "customer") {
      void clearCustomerCart(storeSlug);
    }
  }, [bumpCartRevision, storeSlug]);

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

export function useCartOptional(): CartContextValue | null {
  return useContext(CartContext);
}
