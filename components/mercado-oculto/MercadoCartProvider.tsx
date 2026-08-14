"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  buildMercadoSupplierOrderDrafts,
  clearMercadoCart,
  groupMercadoCartBySupplier,
  mercadoCartItemCount,
  mercadoCartSubtotal,
  readMercadoCart,
  writeMercadoCart,
  type MercadoCartItem,
  type MercadoCartSupplierGroup,
  type MercadoSupplierOrderDraft,
} from "@/lib/mercado-oculto/cart";

type AddInput = {
  productId: string;
  productName: string;
  priceUsd: number;
  quantity?: number;
  thumbUrl?: string | null;
  supplierUserId: string;
  supplierLabel?: string;
  availableStock?: number;
};

type MercadoCartContextValue = {
  items: MercadoCartItem[];
  groups: MercadoCartSupplierGroup[];
  orderDrafts: MercadoSupplierOrderDraft[];
  ready: boolean;
  itemCount: number;
  subtotalUsd: number;
  supplierCount: number;
  addItem: (input: AddInput) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
};

const MercadoCartContext = createContext<MercadoCartContextValue | null>(null);

function subscribeStorage(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const handler = (event: StorageEvent) => {
    if (event.storageArea === sessionStorage) onStoreChange();
  };
  window.addEventListener("storage", handler);
  window.addEventListener("mercado-cart-change", onStoreChange);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("mercado-cart-change", onStoreChange);
  };
}

function getSnapshot() {
  return JSON.stringify(readMercadoCart());
}

function getServerSnapshot() {
  return "[]";
}

function emitCartChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("mercado-cart-change"));
}

export function MercadoCartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const snapshot = useSyncExternalStore(
    subscribeStorage,
    getSnapshot,
    getServerSnapshot,
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const items = useMemo(
    () => JSON.parse(snapshot) as MercadoCartItem[],
    [snapshot],
  );

  const groups = useMemo(() => groupMercadoCartBySupplier(items), [items]);
  const orderDrafts = useMemo(
    () => buildMercadoSupplierOrderDrafts(items),
    [items],
  );

  const persist = useCallback((next: MercadoCartItem[]) => {
    writeMercadoCart(next);
    emitCartChange();
  }, []);

  const addItem = useCallback(
    (input: AddInput) => {
      const qty = Math.max(1, Math.floor(input.quantity ?? 1));
      const stock = Math.max(0, Math.floor(input.availableStock ?? 0));
      const supplierUserId = input.supplierUserId.trim();
      const current = readMercadoCart();
      const existing = current.find((item) => item.productId === input.productId);
      let nextQty = (existing?.quantity ?? 0) + qty;
      if (stock > 0) nextQty = Math.min(nextQty, stock);

      const nextItem: MercadoCartItem = {
        productId: input.productId,
        productName: input.productName,
        priceUsd: input.priceUsd,
        quantity: nextQty,
        thumbUrl: input.thumbUrl ?? null,
        supplierUserId,
        supplierLabel: input.supplierLabel ?? "Mayorista Oficial Alcéntimo",
        availableStock: stock,
      };

      const next = existing
        ? current.map((item) =>
            item.productId === input.productId ? nextItem : item,
          )
        : [...current, nextItem];
      persist(next);
    },
    [persist],
  );

  const setQuantity = useCallback(
    (productId: string, quantity: number) => {
      const qty = Math.floor(quantity);
      const current = readMercadoCart();
      if (qty <= 0) {
        persist(current.filter((item) => item.productId !== productId));
        return;
      }
      persist(
        current.map((item) => {
          if (item.productId !== productId) return item;
          const max = item.availableStock > 0 ? item.availableStock : qty;
          return { ...item, quantity: Math.min(qty, max) };
        }),
      );
    },
    [persist],
  );

  const removeItem = useCallback(
    (productId: string) => {
      persist(readMercadoCart().filter((item) => item.productId !== productId));
    },
    [persist],
  );

  const clear = useCallback(() => {
    clearMercadoCart();
    emitCartChange();
  }, []);

  const value = useMemo<MercadoCartContextValue>(
    () => ({
      items,
      groups,
      orderDrafts,
      ready,
      itemCount: mercadoCartItemCount(items),
      subtotalUsd: mercadoCartSubtotal(items),
      supplierCount: groups.length,
      addItem,
      setQuantity,
      removeItem,
      clear,
    }),
    [
      items,
      groups,
      orderDrafts,
      ready,
      addItem,
      setQuantity,
      removeItem,
      clear,
    ],
  );

  return (
    <MercadoCartContext.Provider value={value}>
      {children}
    </MercadoCartContext.Provider>
  );
}

export function useMercadoCart() {
  const ctx = useContext(MercadoCartContext);
  if (!ctx) {
    throw new Error("useMercadoCart must be used within MercadoCartProvider");
  }
  return ctx;
}
