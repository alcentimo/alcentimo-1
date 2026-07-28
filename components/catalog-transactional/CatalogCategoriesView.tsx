"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CatalogListItem, ExchangeRate, Store } from "@/lib/database.types";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import type { CatalogDesignSettings, CatalogCurrencySettings } from "@/lib/store-settings/types";
import {
  resolveStorefrontCatalogCategories,
  type CatalogCategoryOption,
} from "@/lib/catalog/extract-categories";
import type { StoreLocation, VariantLocationStock } from "@/lib/locations/types";
import {
  getCatalogDesignClasses,
  getCatalogProductGridClassName,
  getCatalogThemeStyle,
} from "@/lib/store-settings/catalog-theme";
import { ProductCard } from "@/components/catalog/ProductCard";
import {
  CatalogProductDetailHost,
  useCatalogProductDetail,
} from "@/components/catalog/CatalogProductDetailHost";
import { useCart } from "@/components/catalog-transactional/CartProvider";
import { CatalogCartHost, type CartPanelView } from "@/components/catalog-transactional/CatalogCartHost";
import {
  useCatalogShellNavigationOptional,
  useRegisterCatalogCartController,
} from "@/components/catalog-transactional/CatalogShellNavigation";
import { CatalogBrowseToolbar } from "@/components/catalog-transactional/CatalogBrowseToolbar";
import { CatalogBrowseLoadMore } from "@/components/catalog-transactional/CatalogBrowseLoadMore";
import { CatalogBrowseStatus } from "@/components/catalog-transactional/CatalogBrowseStatus";
import { useCatalogBrowse } from "@/components/catalog-transactional/useCatalogBrowse";
import {
  CatalogFulfillmentProvider,
  useCatalogFulfillment,
} from "@/components/catalog-transactional/CatalogFulfillmentProvider";
import { CatalogLocationPicker } from "@/components/catalog-transactional/CatalogLocationPicker";
import { CatalogPromoBannerCarousel } from "@/components/catalog-transactional/CatalogPromoBannerCarousel";
import { CatalogStoreIdentityHeader } from "@/components/catalog-transactional/CatalogStoreIdentityHeader";
import { useOpenCatalogProductById } from "@/components/catalog-transactional/useOpenCatalogProductById";
import { applyLocationStockToProduct } from "@/lib/locations/apply-catalog-stock";
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
  initialProductId?: string | null;
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
  initialProductId = null,
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
        initialProductId={initialProductId}
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
  initialProductId = null,
}: Omit<CatalogCategoriesViewProps, "locations" | "locationStocks">) {
  const liveExchangeRate = exchangeRate?.rate ?? null;
  const { showOfficialRate, showBsConversion, wholesaleEnabled } = catalogCurrency;
  const { addItem } = useCart();
  const { getAvailableStock } = useCatalogFulfillment();

  const catalogProducts = useMemo(
    () =>
      products.map((product) =>
        applyLocationStockToProduct(product, getAvailableStock),
      ),
    [products, getAvailableStock],
  );

  const categoryOptions = useMemo(
    () =>
      resolveStorefrontCatalogCategories(
        storeCategories,
        storeCategories,
        store.rubro_tienda,
        catalogProducts,
      ),
    [storeCategories, catalogProducts, store.rubro_tienda],
  );

  const browseServerPagination = useMemo(
    () =>
      enableServerPagination
        ? {
            storeSlug: store.slug,
            initialTotalCount: catalogTotalCount ?? catalogProducts.length,
          }
        : undefined,
    [
      catalogProducts.length,
      catalogTotalCount,
      enableServerPagination,
      store.slug,
    ],
  );

  const browse = useCatalogBrowse(catalogProducts, {
    initialCategorySlug: selectedCategorySlug,
    serverPagination: browseServerPagination,
  });

  const gridClassName = getCatalogProductGridClassName(
    catalogDesign,
    store.rubro_tienda,
  );

  return (
    <CatalogProductDetailHost
      exchangeRate={liveExchangeRate}
      showBsConversion={showBsConversion}
      storeRubro={store.rubro_tienda}
      wholesaleEnabled={wholesaleEnabled}
      onAddToCart={addItem}
    >
      <CatalogCategoriesPageContent
        store={store}
        products={products}
        purchaseInfo={purchaseInfo}
        catalogDesign={catalogDesign}
        catalogCurrency={catalogCurrency}
        exchangeRate={exchangeRate}
        showOfficialRate={showOfficialRate}
        showBsConversion={showBsConversion}
        wholesaleEnabled={wholesaleEnabled}
        liveExchangeRate={liveExchangeRate}
        catalogProducts={catalogProducts}
        categoryOptions={categoryOptions}
        browse={browse}
        gridClassName={gridClassName}
        addItem={addItem}
        initialProductId={initialProductId}
      />
    </CatalogProductDetailHost>
  );
}

interface CatalogCategoriesPageContentProps {
  store: Store;
  products: CatalogListItem[];
  purchaseInfo: PublicPurchaseInfo;
  catalogDesign: CatalogDesignSettings;
  catalogCurrency: CatalogCurrencySettings;
  exchangeRate: ExchangeRate | null;
  showOfficialRate: boolean;
  showBsConversion: boolean;
  wholesaleEnabled: boolean;
  liveExchangeRate: number | null;
  catalogProducts: CatalogListItem[];
  categoryOptions: CatalogCategoryOption[];
  browse: ReturnType<typeof useCatalogBrowse>;
  gridClassName: string;
  addItem: ReturnType<typeof useCart>["addItem"];
  initialProductId?: string | null;
}

function CatalogCategoriesPageContent({
  store,
  products,
  purchaseInfo,
  catalogDesign,
  catalogCurrency,
  exchangeRate,
  showOfficialRate,
  showBsConversion,
  wholesaleEnabled,
  liveExchangeRate,
  catalogProducts,
  categoryOptions,
  browse,
  gridClassName,
  addItem,
  initialProductId = null,
}: CatalogCategoriesPageContentProps) {
  const { openProduct } = useCatalogProductDetail();
  const openProductById = useOpenCatalogProductById(
    store.slug,
    products,
    initialProductId,
  );
  const shellNav = useCatalogShellNavigationOptional();
  const [cartPanelView, setCartPanelView] = useState<CartPanelView>("closed");

  const openCartSummary = useCallback(() => {
    setCartPanelView("summary");
  }, []);

  const closeCart = useCallback(() => {
    setCartPanelView("closed");
  }, []);

  useRegisterCatalogCartController(openCartSummary, closeCart);

  useEffect(() => {
    shellNav?.setCartActive(cartPanelView !== "closed");
  }, [cartPanelView, shellNav]);

  const handleCartPanelViewChange = useCallback((view: CartPanelView) => {
    setCartPanelView(view);
  }, []);

  return (
    <div
      className={cn(
        "txn-catalog",
        getCatalogDesignClasses(catalogDesign, store.rubro_tienda),
      )}
      style={getCatalogThemeStyle(catalogDesign, store.rubro_tienda)}
    >
      <CatalogStoreIdentityHeader
        storeName={store.name}
        storeDescription={store.description}
        logoUrl={store.logo_url}
        eyebrow="Categorías"
        locationHours={purchaseInfo.locationHours}
        showOfficialRate={showOfficialRate}
        exchangeRate={exchangeRate?.rate ?? null}
      />
      <CatalogLocationPicker />

      <CatalogPromoBannerCarousel
        promoBanner={catalogDesign.promoBanner}
        storeName={store.name}
        storeSlug={store.slug}
        onOpenProduct={openProductById}
      />

      {catalogProducts.length > 0 ? (
        <CatalogBrowseToolbar
          searchQuery={browse.searchQuery}
          onSearchQueryChange={browse.setSearchQuery}
          categorySlug={browse.categorySlug}
          onCategorySlugChange={browse.setCategorySlug}
          sortKey={browse.sortKey}
          onSortKeyChange={browse.setSortKey}
          categories={categoryOptions}
          totalCount={catalogProducts.length}
          filteredCount={browse.totalCount}
          hasActiveFilters={browse.hasActiveFilters}
          onClearFilters={browse.clearFilters}
        />
      ) : null}

      <main className="txn-catalog-main">
        {products.length === 0 ? (
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
                  wholesaleEnabled={wholesaleEnabled}
                  onAddToCart={addItem}
                  onOpenDetail={openProduct}
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
        panelView={cartPanelView}
        onPanelViewChange={handleCartPanelViewChange}
      />
    </div>
  );
}
