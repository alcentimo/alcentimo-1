"use client";

import { useMemo } from "react";
import type { CatalogListItem, ExchangeRate, Store } from "@/lib/database.types";
import type { CatalogPreviewSettings } from "@/lib/catalog/get-public-catalog-page-data";
import { CartProvider } from "@/components/catalog-transactional/CartProvider";
import { PromotionProvider } from "@/components/catalog-transactional/PromotionProvider";
import { TransactionalCatalog } from "@/components/catalog-transactional/TransactionalCatalog";
import { CatalogTabBar } from "@/components/catalog-transactional/CatalogTabBar";
import {
  getCatalogDesignClasses,
  getCatalogRubroClass,
  getCatalogThemeStyle,
} from "@/lib/store-settings/catalog-theme";
import { storeHasPCBuilder } from "@/lib/rubros/modules/tecnologia/pc-builder";
import { cn } from "@/lib/cn";

interface CatalogLivePreviewProps {
  store: Store;
  products: CatalogListItem[];
  exchangeRate: number | null;
  exchangeRateUpdatedAt?: string | null;
  settings: CatalogPreviewSettings;
  referenceMode?: boolean;
  showReferenceCta?: boolean;
}

function toPreviewExchangeRate(
  rate: number | null,
  updatedAt?: string | null,
): ExchangeRate | null {
  if (rate == null) return null;

  const timestamp = updatedAt ?? new Date().toISOString();

  return {
    id: "preview-rate",
    rate,
    source: "bcv",
    effective_date: timestamp.slice(0, 10),
    notes: null,
    store_id: null,
    created_at: timestamp,
  };
}

export function CatalogLivePreview({
  store,
  products,
  exchangeRate,
  exchangeRateUpdatedAt = null,
  settings,
  referenceMode = false,
  showReferenceCta = false,
}: CatalogLivePreviewProps) {
  const exchangeRateRow = useMemo(
    () => toPreviewExchangeRate(exchangeRate, exchangeRateUpdatedAt),
    [exchangeRate, exchangeRateUpdatedAt],
  );

  const themeStyle = useMemo(
    () => getCatalogThemeStyle(settings.catalogDesign, store.rubro_tienda),
    [settings.catalogDesign, store.rubro_tienda],
  );

  const themeClasses = useMemo(
    () => getCatalogDesignClasses(settings.catalogDesign, store.rubro_tienda),
    [settings.catalogDesign, store.rubro_tienda],
  );

  return (
    <PromotionProvider value={{ guestBanner: null, autoApply: null }}>
      <CartProvider
        storeSlug={store.slug}
        storeId={store.id}
        userId={null}
        isCustomer={false}
      >
        <div
          className={cn(
            "catalog-live-preview-root txn-catalog-root",
            getCatalogRubroClass(store.rubro_tienda),
            themeClasses,
          )}
          style={themeStyle}
        >
          <div className="catalog-live-preview-scroll">
            <TransactionalCatalog
              store={store}
              products={products}
              exchangeRate={exchangeRateRow}
              purchaseInfo={settings.purchaseInfo}
              catalogDesign={settings.catalogDesign}
              catalogCurrency={settings.catalogCurrency}
              previewMode
              referenceMode={referenceMode}
              showReferenceCta={showReferenceCta}
            />
          </div>
          <div className="catalog-live-preview-tab-bar" aria-hidden="true">
            <CatalogTabBar
              storeSlug={store.slug}
              pcBuilderEnabled={storeHasPCBuilder(store.rubro_tienda)}
            />
          </div>
        </div>
      </CartProvider>
    </PromotionProvider>
  );
}
