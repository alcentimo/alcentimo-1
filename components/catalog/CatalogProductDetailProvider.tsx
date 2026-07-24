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

export function CatalogProductDetailProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [selectedProduct, setSelectedProduct] =
    useState<CatalogListItem | null>(null);

  const openProduct = useCallback((product: CatalogListItem) => {
    setSelectedProduct(product);
  }, []);

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
