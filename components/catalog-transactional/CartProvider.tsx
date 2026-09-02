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
  dedupeCartItems,
  mergeCartItemsPreferLocal,
} from "@/lib/catalog/cart-lines";
import { getCatalogVariantOptions } from "@/lib/products/variants";
import { giftCardWholesaleEnabled, isGiftCardCatalogItem } from "@/lib/gift-cards/catalog";
import { useGiftCardsEnabled } from "@/components/catalog-transactional/GiftCardStorefrontProvider";
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
import { syncDropshipCartHolds } from "@/lib/dropship/cart-hold-actions";
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

function lineKeyOf(item: CartItem): string {
  return cartItemKey(
    item.product.product_id,
    item.variantId,
    item.modifiers,
  );
}

function refreshCartItemPricing(
  item: CartItem,
  quantity: number,
  wholesaleEnabled: boolean,
): CartItem {
  const variant = getCatalogVariantOptions(item.product).find(
    (option) => option.id === item.variantId,
  );
  if (!variant) {
    if (item.quantity === quantity) return item;
    return { ...item, quantity };
  }
  const next = buildCartItem(
    item.product,
    variant,
    quantity,
    item.modifiers ?? [],
    giftCardWholesaleEnabled(item.product, wholesaleEnabled),
  );
  if (
    next.quantity === item.quantity &&
    next.unitPriceUsd === item.unitPriceUsd &&
    next.unitPriceVes === item.unitPriceVes &&
    next.wholesaleApplied === item.wholesaleApplied &&
    next.variantId === item.variantId &&
    next.variantName === item.variantName &&
    next.availableStock === item.availableStock
  ) {
    return item;
  }
  return next;
}

/**
 * Tras sync remota: solo quitar líneas que el servidor no pudo hidratar (agotadas)
 * o bajar cantidad si el stock la limitó. No reemplazar el carrito entero (evita
 * bucles setItems → useEffect → sync → setItems).
 */
function reconcileSyncedCart(
  current: CartItem[],
  synced: CartItem[],
  wholesaleEnabled: boolean,
): CartItem[] {
  if (synced.length === 0) {
    // Fallo de hidratación parcial ya se rechaza en syncCustomerCart; no vaciar aquí.
    return current;
  }

  const syncedByKey = new Map(synced.map((item) => [lineKeyOf(item), item]));
  const hasOverlap = current.some((item) => syncedByKey.has(lineKeyOf(item)));
  if (current.length > 0 && !hasOverlap) {
    // La hidratación remapeó variantIds: conservar el carrito local intacto.
    return current;
  }

  let changed = false;
  const next: CartItem[] = [];

  for (const item of current) {
    const key = lineKeyOf(item);
    const remote = syncedByKey.get(key);
    if (!remote) {
      changed = true;
      continue;
    }
    if (remote.quantity < item.quantity) {
      changed = true;
      next.push(
        refreshCartItemPricing(item, remote.quantity, wholesaleEnabled),
      );
      continue;
    }
    if (remote.availableStock !== item.availableStock) {
      changed = true;
      next.push({ ...item, availableStock: remote.availableStock });
      continue;
    }
    next.push(item);
  }

  return changed ? dedupeCartItems(next) : current;
}

type PersistMode = "guest" | "customer";

function dropDisallowedGiftCardItems(
  items: CartItem[],
  giftCardsEnabled: boolean,
): CartItem[] {
  if (giftCardsEnabled) return items;
  return items.filter((item) => !isGiftCardCatalogItem(item.product));
}

export function CartProvider({
  storeSlug,
  storeId,
  userId,
  isCustomer,
  wholesaleEnabled = false,
  children,
}: CartProviderProps) {
  const giftCardsEnabled = useGiftCardsEnabled();
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [persistMode, setPersistMode] = useState<PersistMode>(
    isCustomer && userId && storeId ? "customer" : "guest",
  );

  const syncPausedRef = useRef(false);
  const persistModeRef = useRef<PersistMode>(persistMode);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncInFlightRef = useRef(false);
  /** Sube en cada mutación local para invalidar syncs/bootstraps obsoletos. */
  const cartRevisionRef = useRef(0);
  const customerBootstrapDoneRef = useRef(false);
  const wholesaleEnabledRef = useRef(wholesaleEnabled);

  const bumpCartRevision = useCallback(() => {
    cartRevisionRef.current += 1;
  }, []);

  useEffect(() => {
    persistModeRef.current = persistMode;
  }, [persistMode]);

  useEffect(() => {
    wholesaleEnabledRef.current = wholesaleEnabled;
  }, [wholesaleEnabled]);

  useEffect(() => {
    if (giftCardsEnabled) return;
    setItems((current) => {
      const next = dropDisallowedGiftCardItems(current, false);
      return next.length === current.length ? current : next;
    });
  }, [giftCardsEnabled]);

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
      return { items: dedupeCartItems(guestItems), isCustomer: true as const };
    }

    if (guestLines.length > 0) {
      const merged = await mergeGuestCart(storeSlug, guestLines);
      if (merged.ok) {
        clearStoredCart(storeSlug);
        return {
          items: dedupeCartItems(merged.items),
          isCustomer: true as const,
        };
      }
    }

    const loaded = await getCustomerCart(storeSlug);
    if (loaded.ok) {
      return {
        items: dedupeCartItems(loaded.items),
        isCustomer: true as const,
      };
    }

    return {
      items: dedupeCartItems(guestItems),
      isCustomer: false as const,
    };
  }, [storeSlug]);

  const applyBootstrappedItems = useCallback(
    (nextItems: CartItem[], revisionAtStart: number) => {
      const normalized = dedupeCartItems(nextItems);
      setItems((current) => {
        if (cartRevisionRef.current !== revisionAtStart) {
          // El usuario agregó/quitó productos mientras cargábamos: no pisar.
          return dedupeCartItems(
            mergeCartItemsPreferLocal(normalized, current),
          );
        }
        return normalized;
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
      customerBootstrapDoneRef.current = canPersist;
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
    customerBootstrapDoneRef.current = false;

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
            customerBootstrapDoneRef.current = canPersist;
          }
        } else if (!cancelled) {
          applyBootstrappedItems(readStoredCart(storeSlug), revisionAtStart);
          setPersistMode("guest");
          customerBootstrapDoneRef.current = false;
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
        customerBootstrapDoneRef.current = false;
        setPersistMode("guest");
        setItems(dedupeCartItems(readStoredCart(storeSlug)));
        syncPausedRef.current = false;
        return;
      }

      // Evitar re-fusionar el carrito en cada SIGNED_IN/token (multiplicaría qty).
      if (event === "SIGNED_IN" && !customerBootstrapDoneRef.current) {
        void bootstrapCustomerSession();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [storeSlug, bootstrapCustomerSession, bumpCartRevision]);

  useEffect(() => {
    if (!hydrated || syncPausedRef.current) return;
    setItems((current) => {
      let changed = false;
      const next = current.map((item) => {
        const refreshed = refreshCartItemPricing(
          item,
          item.quantity,
          wholesaleEnabled,
        );
        if (refreshed !== item) changed = true;
        return refreshed;
      });
      return changed ? dedupeCartItems(next) : current;
    });
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

    // Snapshot de líneas a persistir. La sync es principalmente write-only:
    // no reinyectar result.items completos (eso re-disparaba este efecto en bucle).
    const linesToSync = cartItemsToLines(items);
    const syncedLinesKey = JSON.stringify(linesToSync);
    const revisionAtSchedule = cartRevisionRef.current;

    syncTimerRef.current = setTimeout(() => {
      void (async () => {
        if (syncInFlightRef.current) return;
        if (cartRevisionRef.current !== revisionAtSchedule) return;

        syncInFlightRef.current = true;
        setIsSyncing(true);
        try {
          const result = await syncCustomerCart(storeSlug, linesToSync);
          if (!result.ok) return;
          if (cartRevisionRef.current !== revisionAtSchedule) return;

          setItems((current) => {
            const currentLinesKey = JSON.stringify(cartItemsToLines(current));
            if (currentLinesKey !== syncedLinesKey) {
              return current;
            }
            const hasModifiers = current.some(
              (item) => (item.modifiers?.length ?? 0) > 0,
            );
            if (hasModifiers) return current;

            return reconcileSyncedCart(
              current,
              result.items,
              wholesaleEnabledRef.current,
            );
          });
        } finally {
          syncInFlightRef.current = false;
          setIsSyncing(false);
        }
      })();
    }, SYNC_DEBOUNCE_MS);

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, [storeSlug, items, hydrated, persistMode]);

  useEffect(() => {
    if (!hydrated || syncPausedRef.current || persistMode !== "guest") {
      return;
    }
    const linesToSync = cartItemsToLines(items);
    const revisionAtSchedule = cartRevisionRef.current;
    const timer = setTimeout(() => {
      void (async () => {
        if (cartRevisionRef.current !== revisionAtSchedule) return;
        await syncDropshipCartHolds(storeSlug, linesToSync);
      })();
    }, SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [storeSlug, items, hydrated, persistMode]);

  const addItem = useCallback(
    (
      product: CatalogListItem,
      variant: CatalogVariantOption,
      modifiers: import("@/lib/catalog/cart-types").CartModifierSelection[] = [],
    ) => {
      if (isGiftCardCatalogItem(product) && !giftCardsEnabled) {
        return;
      }
      setItems((current) => {
        const deduped = dedupeCartItems(current);
        const key = cartItemKey(product.product_id, variant.id, modifiers);
        const existing = deduped.find(
          (item) =>
            cartItemKey(
              item.product.product_id,
              item.variantId,
              item.modifiers,
            ) === key,
        );

        const qtyForVariant = deduped
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
          bumpCartRevision();
          return deduped.map((item) =>
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
          return current === deduped ? current : deduped;
        }

        bumpCartRevision();
        // Append inmutable: +1 unidad en una sola línea por clave.
        return [
          ...deduped,
          buildCartItem(
            product,
            variant,
            1,
            modifiers,
            giftCardWholesaleEnabled(product, wholesaleEnabled),
          ),
        ];
      });
    },
    [bumpCartRevision, wholesaleEnabled, giftCardsEnabled],
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
        dedupeCartItems(current).filter(
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
      const key = cartItemKey(productId, variantId, modifiers);
      setItems((current) => {
        const deduped = dedupeCartItems(current);
        const target = deduped.find(
          (item) =>
            cartItemKey(
              item.product.product_id,
              item.variantId,
              item.modifiers,
            ) === key,
        );
        if (!target) return current;

        const otherQty = deduped
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
          Number(target.availableStock) || 0,
        );
        const maxForLine = Math.max(0, stockCap - otherQty);

        let nextQty: number;
        if (quantity <= 0) {
          nextQty = 0;
        } else if (maxForLine > 0) {
          nextQty = Math.min(quantity, maxForLine);
        } else {
          nextQty = Math.min(quantity, target.quantity);
        }

        if (nextQty === target.quantity) {
          return current === deduped ? current : deduped;
        }

        bumpCartRevision();
        return deduped
          .map((item) =>
            cartItemKey(
              item.product.product_id,
              item.variantId,
              item.modifiers,
            ) === key
              ? refreshCartItemPricing(item, nextQty, wholesaleEnabled)
              : item,
          )
          .filter((item) => item.quantity > 0);
      });
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
