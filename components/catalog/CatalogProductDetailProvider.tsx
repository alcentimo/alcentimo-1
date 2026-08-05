"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CatalogListItem } from "@/lib/database.types";

interface CatalogProductDetailContextValue {
  selectedProduct: CatalogListItem | null;
  openProduct: (product: CatalogListItem) => void;
  closeProduct: () => void;
}

const CatalogProductDetailContext =
  createContext<CatalogProductDetailContextValue | null>(null);

interface CatalogProductDetailProviderProps {
  children: ReactNode;
  storeId?: string | null;
  storeSlug?: string | null;
}

export function CatalogProductDetailProvider({
  children,
  storeId = null,
  storeSlug = null,
}: CatalogProductDetailProviderProps) {
  const [selectedProduct, setSelectedProduct] =
    useState<CatalogListItem | null>(null);

  const openProduct = useCallback(
    (product: CatalogListItem) => {
      setSelectedProduct(product);
      if (storeId && storeSlug && product.product_id) {
        void fetch("/api/analytics/visit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "product",
            storeId,
            storeSlug,
            productId: product.product_id,
          }),
          keepalive: true,
        }).catch(() => {
          // Silenciar errores de tracking.
        });
      }
    },
    [storeId, storeSlug],
  );

  const closeProduct = useCallback(() => {
    setSelectedProduct(null);
  }, []);

  const value = useMemo(
    () => ({
      selectedProduct,
      openProduct,
      closeProduct,
    }),
    [selectedProduct, openProduct, closeProduct],
  );

  return (
    <CatalogProductDetailContext.Provider value={value}>
      {children}
    </CatalogProductDetailContext.Provider>
  );
}

export function useCatalogProductDetail(): CatalogProductDetailContextValue {
  const context = useContext(CatalogProductDetailContext);
  if (!context) {
    throw new Error(
      "useCatalogProductDetail debe usarse dentro de CatalogProductDetailProvider.",
    );
  }
  return context;
}

export function useCatalogProductDetailOptional(): CatalogProductDetailContextValue | null {
  return useContext(CatalogProductDetailContext);
}
