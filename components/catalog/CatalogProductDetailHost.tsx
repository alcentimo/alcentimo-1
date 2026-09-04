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
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import type { ReactNode } from "react";

interface CatalogProductDetailHostProps {
  children: ReactNode;
  storeId?: string | null;
  storeSlug?: string | null;
  exchangeRate?: number | null;
  showBsConversion?: boolean;
  showOfficialRate?: boolean;
  storeRubro?: string | null;
  wholesaleEnabled?: boolean;
  checkoutType?: CheckoutType;
  whatsappPhone?: string | null;
  syncProductUrl?: boolean;
  onSelectBrand?: (brand: string) => void;
  catalogProducts?: CatalogListItem[];
  purchaseInfo?: Pick<PublicPurchaseInfo, "payments" | "installments"> | null;
  onAddToCart?: (
    product: CatalogListItem,
    variant: CatalogVariantOption,
    modifiers?: CartModifierSelection[],
  ) => void;
}

function CatalogProductDetailLayer({
  exchangeRate,
  showBsConversion,
  showOfficialRate,
  storeRubro,
  wholesaleEnabled,
  checkoutType,
  whatsappPhone,
  onAddToCart,
  onSelectBrand,
  catalogProducts,
  purchaseInfo,
}: Omit<CatalogProductDetailHostProps, "children" | "storeId" | "storeSlug">) {
  const { selectedProduct, closeProduct, openProduct } = useCatalogProductDetail();

  if (!selectedProduct) return null;

  return (
    <CatalogProductDetailPanel
      product={selectedProduct}
      exchangeRate={exchangeRate}
      showBsConversion={showBsConversion}
      showOfficialRate={showOfficialRate}
      storeRubro={storeRubro}
      wholesaleEnabled={wholesaleEnabled}
      checkoutType={checkoutType}
      whatsappPhone={whatsappPhone}
      onClose={closeProduct}
      onSelectBrand={onSelectBrand}
      catalogProducts={catalogProducts}
      purchaseInfo={purchaseInfo}
      onSelectRelated={openProduct}
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
  showOfficialRate,
  storeRubro,
  wholesaleEnabled,
  checkoutType,
  whatsappPhone,
  syncProductUrl = true,
  onAddToCart,
  onSelectBrand,
  catalogProducts,
  purchaseInfo,
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
        showOfficialRate={showOfficialRate}
        storeRubro={storeRubro}
        wholesaleEnabled={wholesaleEnabled}
        checkoutType={checkoutType}
        whatsappPhone={whatsappPhone}
        onAddToCart={onAddToCart}
        onSelectBrand={onSelectBrand}
        catalogProducts={catalogProducts}
        purchaseInfo={purchaseInfo}
      />
    </CatalogProductDetailProvider>
  );
}

export { useCatalogProductDetail } from "@/components/catalog/CatalogProductDetailProvider";
