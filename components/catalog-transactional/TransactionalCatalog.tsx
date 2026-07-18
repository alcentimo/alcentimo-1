"use client";

import { useMemo } from "react";
import Image from "next/image";
import type { CatalogListItem, ExchangeRate, Store } from "@/lib/database.types";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import type { CatalogDesignSettings, CatalogCurrencySettings } from "@/lib/store-settings/types";
import { getCatalogThemeStyle } from "@/lib/store-settings/catalog-theme";
import { formatExchangeRate } from "@/lib/format";
import { ProductCard } from "@/components/catalog/ProductCard";
import { StoreOpenBadge } from "@/components/catalog/StoreOpenBadge";
import { useCart } from "@/components/catalog-transactional/CartProvider";
import { CatalogCartHost } from "@/components/catalog-transactional/CatalogCartHost";
import { isProductOutOfStock } from "@/lib/products/variants";
import { cn } from "@/lib/cn";

interface TransactionalCatalogProps {
  store: Store;
  products: CatalogListItem[];
  exchangeRate: ExchangeRate | null;
  purchaseInfo: PublicPurchaseInfo;
  catalogDesign: CatalogDesignSettings;
  catalogCurrency: CatalogCurrencySettings;
  openCheckoutInitially?: boolean;
  previewMode?: boolean;
}

function getStoreInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "T";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

export function TransactionalCatalog({
  store,
  products,
  exchangeRate,
  purchaseInfo,
  catalogDesign,
  catalogCurrency,
  openCheckoutInitially = false,
  previewMode = false,
}: TransactionalCatalogProps) {
  const liveExchangeRate = exchangeRate?.rate ?? null;
  const { showOfficialRate, showBsConversion } = catalogCurrency;
  const { addItem } = useCart();

  const availableProducts = useMemo(
    () => products.filter((product) => !isProductOutOfStock(product)),
    [products],
  );

  const storeInitials = getStoreInitials(store.name);

  return (
    <div
      className={cn(
        "txn-catalog",
        catalogDesign.layout === "list" && "txn-catalog--list",
        previewMode && "txn-catalog--preview",
      )}
      style={getCatalogThemeStyle(catalogDesign.primaryColor)}
    >
      <header className="txn-catalog-header">
        <div className="txn-catalog-header-inner">
          <div className="txn-catalog-brand">
            {store.logo_url ? (
              <div className="txn-store-logo">
                <Image
                  src={store.logo_url}
                  alt={`Logo de ${store.name}`}
                  fill
                  sizes="36px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="txn-store-logo-fallback" aria-hidden="true">
                {storeInitials}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="txn-catalog-eyebrow">Catálogo</p>
                <StoreOpenBadge locationHours={purchaseInfo.locationHours} />
              </div>
              <h1 className="txn-catalog-title">{store.name}</h1>
              {store.description && (
                <p className="txn-catalog-desc">{store.description}</p>
              )}
              {showOfficialRate && exchangeRate && (
                <p className="txn-catalog-rate">
                  Tasa BCV: Bs. {formatExchangeRate(exchangeRate.rate)} / USD
                </p>
              )}
            </div>
          </div>

        </div>
      </header>

      <main className="txn-catalog-main">
        {availableProducts.length === 0 ? (
          <div className="txn-catalog-empty">
            <p className="text-sm font-medium text-neutral-800">
              No hay productos disponibles
            </p>
            <p className="mt-1.5 text-xs text-neutral-500">
              Vuelve pronto para ver el catálogo actualizado.
            </p>
          </div>
        ) : (
          <div
            className={
              catalogDesign.layout === "list"
                ? "txn-product-list"
                : "txn-product-grid"
            }
          >
            {availableProducts.map((product) => (
              <ProductCard
                key={product.product_id}
                product={product}
                exchangeRate={liveExchangeRate}
                showBsConversion={showBsConversion}
                onAddToCart={addItem}
              />
            ))}
          </div>
        )}
      </main>

      {!previewMode ? (
        <CatalogCartHost
          store={store}
          purchaseInfo={purchaseInfo}
          openInitially={openCheckoutInitially}
        />
      ) : null}
    </div>
  );
}
