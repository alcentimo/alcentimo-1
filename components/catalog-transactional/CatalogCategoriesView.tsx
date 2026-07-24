"use client";

import { useMemo } from "react";
import type { CatalogListItem, ExchangeRate, Store } from "@/lib/database.types";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import type { CatalogDesignSettings, CatalogCurrencySettings } from "@/lib/store-settings/types";
import {
  resolvePublicCatalogCategories,
  type CatalogCategoryOption,
} from "@/lib/catalog/extract-categories";
import type { StoreLocation, VariantLocationStock } from "@/lib/locations/types";
import {
  getCatalogDesignClasses,
  getCatalogThemeStyle,
} from "@/lib/store-settings/catalog-theme";
import { ProductCard } from "@/components/catalog/ProductCard";
import { useCart } from "@/components/catalog-transactional/CartProvider";
import { CatalogCartHost } from "@/components/catalog-transactional/CatalogCartHost";
import { CatalogBrowseToolbar } from "@/components/catalog-transactional/CatalogBrowseToolbar";
import { CatalogBrowseLoadMore } from "@/components/catalog-transactional/CatalogBrowseLoadMore";
import { CatalogBrowseStatus } from "@/components/catalog-transactional/CatalogBrowseStatus";
import { useCatalogBrowse } from "@/components/catalog-transactional/useCatalogBrowse";
import {
  CatalogFulfillmentProvider,
  useCatalogFulfillment,
} from "@/components/catalog-transactional/CatalogFulfillmentProvider";
import { CatalogLocationPicker } from "@/components/catalog-transactional/CatalogLocationPicker";
import { applyLocationStockToProduct } from "@/lib/locations/apply-catalog-stock";
import { isProductOutOfStock } from "@/lib/products/variants";
import { cn } from "@/lib/cn";

interface CatalogCategoriesViewProps {
  store: Store;
  products: CatalogListItem[];
  storeCategories: CatalogCategoryOption[];
  selectedCategorySlug: string | null;
  exchangeRate: ExchangeRate | null;
  purchaseInfo: PublicPurchaseInfo;
  catalogDesign: CatalogDesignSettings;
  catalogCurrency: CatalogCurrencySettings;
  locations?: StoreLocation[];
  locationStocks?: VariantLocationStock[];
  catalogTotalCount?: number;
  enableServerPagination?: boolean;
}

export function CatalogCategoriesView({
  store,
  products,
  storeCategories,
  selectedCategorySlug,
  exchangeRate,
  purchaseInfo,
  catalogDesign,
  catalogCurrency,
  locations = [],
  locationStocks = [],
  catalogTotalCount,
  enableServerPagination = false,
}: CatalogCategoriesViewProps) {
  return (
    <CatalogFulfillmentProvider
      storeSlug={store.slug}
      locations={locations}
      locationStocks={locationStocks}
    >
      <CatalogCategoriesViewInner
        store={store}
        products={products}
        storeCategories={storeCategories}
        selectedCategorySlug={selectedCategorySlug}
        exchangeRate={exchangeRate}
        purchaseInfo={purchaseInfo}
        catalogDesign={catalogDesign}
        catalogCurrency={catalogCurrency}
        catalogTotalCount={catalogTotalCount}
        enableServerPagination={enableServerPagination}
      />
    </CatalogFulfillmentProvider>
  );
}

function CatalogCategoriesViewInner({
  store,
  products,
  storeCategories,
  selectedCategorySlug,
  exchangeRate,
  purchaseInfo,
  catalogDesign,
  catalogCurrency,
  catalogTotalCount,
  enableServerPagination = false,
}: Omit<CatalogCategoriesViewProps, "locations" | "locationStocks">) {
  const liveExchangeRate = exchangeRate?.rate ?? null;
  const { showBsConversion } = catalogCurrency;
  const { addItem } = useCart();
  const { getAvailableStock } = useCatalogFulfillment();

  const locationAwareProducts = useMemo(
    () =>
      products.map((product) =>
        applyLocationStockToProduct(product, getAvailableStock),
      ),
    [products, getAvailableStock],
  );

  const availableProducts = useMemo(
    () => locationAwareProducts.filter((product) => !isProductOutOfStock(product)),
    [locationAwareProducts],
  );

  const categoryOptions = useMemo(
    () => resolvePublicCatalogCategories(storeCategories, availableProducts),
    [storeCategories, availableProducts],
  );

  const browseServerPagination = useMemo(
    () =>
      enableServerPagination
        ? {
            storeSlug: store.slug,
            initialTotalCount: catalogTotalCount ?? availableProducts.length,
          }
        : undefined,
    [
      availableProducts.length,
      catalogTotalCount,
      enableServerPagination,
      store.slug,
    ],
  );

  const browse = useCatalogBrowse(availableProducts, {
    initialCategorySlug: selectedCategorySlug,
    serverPagination: browseServerPagination,
  });

  const gridClassName =
    catalogDesign.layout === "list" ? "txn-product-list" : "txn-product-grid";

  return (
    <div
      className={cn(
        "txn-catalog",
        getCatalogDesignClasses(catalogDesign, store.rubro_tienda),
      )}
      style={getCatalogThemeStyle(catalogDesign, store.rubro_tienda)}
    >
      <header className="txn-catalog-header">
        <div className="txn-catalog-header-inner">
          <h1 className="txn-catalog-title">{store.name}</h1>
        </div>
        <CatalogLocationPicker />
      </header>

      {availableProducts.length > 0 ? (
        <CatalogBrowseToolbar
          searchQuery={browse.searchQuery}
          onSearchQueryChange={browse.setSearchQuery}
          categorySlug={browse.categorySlug}
          onCategorySlugChange={browse.setCategorySlug}
          sortKey={browse.sortKey}
          onSortKeyChange={browse.setSortKey}
          categories={categoryOptions}
          totalCount={availableProducts.length}
          filteredCount={browse.totalCount}
          hasActiveFilters={browse.hasActiveFilters}
          onClearFilters={browse.clearFilters}
        />
      ) : null}

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
        ) : browse.totalCount === 0 && !browse.loadingFilter ? (
          <div className="txn-catalog-empty">
            <p className="text-sm font-medium text-neutral-800">
              No hay productos en esta categoría
            </p>
            <p className="mt-1.5 text-xs text-neutral-500">
              Prueba otra categoría o limpia los filtros.
            </p>
          </div>
        ) : (
          <>
            <CatalogBrowseStatus
              loading={browse.loadingFilter}
              error={
                browse.fetchErrorSource === "filter" ? browse.fetchError : null
              }
              onRetry={browse.retryFetch}
            />
            <div
              className={cn(
                gridClassName,
                browse.loadingFilter && "catalog-product-grid-updating",
              )}
            >
              {browse.visibleProducts.map((product) => (
                <ProductCard
                  key={product.product_id}
                  product={product}
                  exchangeRate={liveExchangeRate}
                  showBsConversion={showBsConversion}
                  catalogVisibility={catalogDesign.visibility}
                  storeRubro={store.rubro_tienda}
                  onAddToCart={addItem}
                />
              ))}
            </div>
            <CatalogBrowseLoadMore
              visibleCount={browse.visibleCount}
              totalCount={browse.totalCount}
              hasMore={browse.hasMore}
              loading={browse.loadingMore}
              error={
                browse.fetchErrorSource === "more" ? browse.fetchError : null
              }
              onLoadMore={browse.loadMore}
              onRetry={browse.retryFetch}
            />
          </>
        )}
      </main>

      <CatalogCartHost
        store={store}
        purchaseInfo={purchaseInfo}
        exchangeRate={liveExchangeRate}
        showOfficialRate={catalogCurrency.showOfficialRate}
        showBsConversion={catalogCurrency.showBsConversion}
      />
    </div>
  );
}
