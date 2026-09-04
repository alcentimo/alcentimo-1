"use client";

import {
  CatalogProductDetailProvider,
  useCatalogProductDetail,
} from "@/components/catalog/CatalogProductDetailProvider";
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

export function CatalogProductDetailHost({
  children,
  storeId,
  storeSlug,
  syncProductUrl = true,
}: CatalogProductDetailHostProps) {
  return (
    <CatalogProductDetailProvider
      storeId={storeId}
      storeSlug={storeSlug}
      syncProductUrl={syncProductUrl}
    >
      {children}
    </CatalogProductDetailProvider>
  );
}

export { useCatalogProductDetail } from "@/components/catalog/CatalogProductDetailProvider";
