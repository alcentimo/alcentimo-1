"use client";

import {
  CatalogProductDetailProvider,
  useCatalogProductDetail,
} from "@/components/catalog/CatalogProductDetailProvider";
import { CatalogProductDetailPanel } from "@/components/catalog/CatalogProductDetailPanel";
import type { CatalogListItem } from "@/lib/database.types";
import type { CatalogVariantOption } from "@/lib/products/variants";
import type { CartModifierSelection } from "@/lib/catalog/cart-types";
import type { ReactNode } from "react";

interface CatalogProductDetailHostProps {
  children: ReactNode;
  exchangeRate?: number | null;
  showBsConversion?: boolean;
  storeRubro?: string | null;
  wholesaleEnabled?: boolean;
  onAddToCart?: (
    product: CatalogListItem,
    variant: CatalogVariantOption,
    modifiers?: CartModifierSelection[],
  ) => void;
}

function CatalogProductDetailLayer({
  exchangeRate,
  showBsConversion,
  storeRubro,
  wholesaleEnabled,
  onAddToCart,
}: Omit<CatalogProductDetailHostProps, "children">) {
  const { selectedProduct, closeProduct } = useCatalogProductDetail();

  if (!selectedProduct) return null;

  return (
    <CatalogProductDetailPanel
      product={selectedProduct}
      exchangeRate={exchangeRate}
      showBsConversion={showBsConversion}
      storeRubro={storeRubro}
      wholesaleEnabled={wholesaleEnabled}
      onClose={closeProduct}
      onAddToCart={onAddToCart}
    />
  );
}

export function CatalogProductDetailHost({
  children,
  exchangeRate,
  showBsConversion,
  storeRubro,
  wholesaleEnabled,
  onAddToCart,
}: CatalogProductDetailHostProps) {
  return (
    <CatalogProductDetailProvider>
      {children}
      <CatalogProductDetailLayer
        exchangeRate={exchangeRate}
        showBsConversion={showBsConversion}
        storeRubro={storeRubro}
        wholesaleEnabled={wholesaleEnabled}
        onAddToCart={onAddToCart}
      />
    </CatalogProductDetailProvider>
  );
}

export { useCatalogProductDetail } from "@/components/catalog/CatalogProductDetailProvider";
