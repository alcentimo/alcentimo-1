"use client";

import {
  CatalogProductDetailProvider,
  useCatalogProductDetail,
} from "@/components/catalog/CatalogProductDetailProvider";
import { CatalogProductDetailPanel } from "@/components/catalog/CatalogProductDetailPanel";
import type { CatalogListItem } from "@/lib/database.types";
import type { CatalogVariantOption } from "@/lib/products/variants";
import type { CartModifierSelection } from "@/lib/catalog/cart-types";
import type { CheckoutType } from "@/lib/store-settings/types";
import type { ReactNode } from "react";

interface CatalogProductDetailHostProps {
  children: ReactNode;
  storeId?: string | null;
  storeSlug?: string | null;
  exchangeRate?: number | null;
  showBsConversion?: boolean;
  storeRubro?: string | null;
  wholesaleEnabled?: boolean;
  checkoutType?: CheckoutType;
  whatsappPhone?: string | null;
  syncProductUrl?: boolean;
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
  checkoutType,
  whatsappPhone,
  onAddToCart,
}: Omit<CatalogProductDetailHostProps, "children" | "storeId" | "storeSlug">) {
  const { selectedProduct, closeProduct } = useCatalogProductDetail();

  if (!selectedProduct) return null;

  return (
    <CatalogProductDetailPanel
      product={selectedProduct}
      exchangeRate={exchangeRate}
      showBsConversion={showBsConversion}
      storeRubro={storeRubro}
      wholesaleEnabled={wholesaleEnabled}
      checkoutType={checkoutType}
      whatsappPhone={whatsappPhone}
      onClose={closeProduct}
      onAddToCart={onAddToCart}
    />
  );
}

export function CatalogProductDetailHost({
  children,
  storeId,
  storeSlug,
  exchangeRate,
  showBsConversion,
  storeRubro,
  wholesaleEnabled,
  checkoutType,
  whatsappPhone,
  syncProductUrl = true,
  onAddToCart,
}: CatalogProductDetailHostProps) {
  return (
    <CatalogProductDetailProvider
      storeId={storeId}
      storeSlug={storeSlug}
      syncProductUrl={syncProductUrl}
    >
      {children}
      <CatalogProductDetailLayer
        exchangeRate={exchangeRate}
        showBsConversion={showBsConversion}
        storeRubro={storeRubro}
        wholesaleEnabled={wholesaleEnabled}
        checkoutType={checkoutType}
        whatsappPhone={whatsappPhone}
        onAddToCart={onAddToCart}
      />
    </CatalogProductDetailProvider>
  );
}

export { useCatalogProductDetail } from "@/components/catalog/CatalogProductDetailProvider";
