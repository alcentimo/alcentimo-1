"use client";

import { useMemo } from "react";
import type { CatalogListItem, ExchangeRate, Store } from "@/lib/database.types";
import type { CatalogPreviewSettings } from "@/lib/catalog/get-public-catalog-page-data";
import { CartProvider } from "@/components/catalog-transactional/CartProvider";
import { PromotionProvider } from "@/components/catalog-transactional/PromotionProvider";
import { TransactionalCatalog } from "@/components/catalog-transactional/TransactionalCatalog";
import { CatalogTabBar } from "@/components/catalog-transactional/CatalogTabBar";

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

  return (
    <PromotionProvider value={{ guestBanner: null, autoApply: null }}>
      <CartProvider
        storeSlug={store.slug}
        storeId={store.id}
        userId={null}
        isCustomer={false}
      >
        <div className="catalog-live-preview-root txn-catalog-root">
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
          <div className="catalog-live-preview-tab-bar" aria-hidden="true">
            <CatalogTabBar storeSlug={store.slug} />
          </div>
        </div>
      </CartProvider>
    </PromotionProvider>
  );
}
