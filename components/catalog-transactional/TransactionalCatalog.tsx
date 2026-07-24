"use client";

import { useCallback, useMemo } from "react";
import Image from "next/image";
import type { CatalogListItem, ExchangeRate, Store } from "@/lib/database.types";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import type { CatalogDesignSettings, CatalogCurrencySettings } from "@/lib/store-settings/types";
import type { CatalogCategoryOption } from "@/lib/catalog/extract-categories";
import type { StoreLocation, VariantLocationStock } from "@/lib/locations/types";
import { resolvePublicCatalogCategories } from "@/lib/catalog/extract-categories";
import {
  getCatalogDesignClasses,
  getCatalogThemeStyle,
} from "@/lib/store-settings/catalog-theme";
import { formatExchangeRate } from "@/lib/format";
import { ProductCard } from "@/components/catalog/ProductCard";
import {
  CatalogProductDetailHost,
  useCatalogProductDetail,
} from "@/components/catalog/CatalogProductDetailHost";
import { CatalogUploadCtaCard } from "@/components/catalog/CatalogUploadCtaCard";
import { StoreOpenBadge } from "@/components/catalog/StoreOpenBadge";
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
import { storeUsesRubroProductModule } from "@/lib/rubros/registry";
import { groupProductsByFoodMenu } from "@/lib/rubros/modules/alimentos";
import { cn } from "@/lib/cn";

interface TransactionalCatalogProps {
  store: Store;
  products: CatalogListItem[];
  storeCategories?: CatalogCategoryOption[];
  exchangeRate: ExchangeRate | null;
  purchaseInfo: PublicPurchaseInfo;
  catalogDesign: CatalogDesignSettings;
  catalogCurrency: CatalogCurrencySettings;
  openCheckoutInitially?: boolean;
  previewMode?: boolean;
  referenceMode?: boolean;
  showReferenceCta?: boolean;
  locations?: StoreLocation[];
  locationStocks?: VariantLocationStock[];
  /** Total de productos en BD (catálogo público paginado). */
  catalogTotalCount?: number;
  enableServerPagination?: boolean;
}

function getStoreInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "T";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

function resolveCategoryOptions(
  storeCategories: CatalogCategoryOption[],
  products: CatalogListItem[],
): CatalogCategoryOption[] {
  return resolvePublicCatalogCategories(storeCategories, products);
}

export function TransactionalCatalog({
  store,
  products,
  storeCategories = [],
  exchangeRate,
  purchaseInfo,
  catalogDesign,
  catalogCurrency,
  openCheckoutInitially = false,
  previewMode = false,
  referenceMode = false,
  showReferenceCta = false,
  locations = [],
  locationStocks = [],
  catalogTotalCount,
  enableServerPagination = false,
}: TransactionalCatalogProps) {
  return (
    <CatalogFulfillmentProvider
      storeSlug={store.slug}
      locations={locations}
      locationStocks={locationStocks}
    >
      <TransactionalCatalogInner
        store={store}
        products={products}
        storeCategories={storeCategories}
        exchangeRate={exchangeRate}
        purchaseInfo={purchaseInfo}
        catalogDesign={catalogDesign}
        catalogCurrency={catalogCurrency}
        openCheckoutInitially={openCheckoutInitially}
        previewMode={previewMode}
        referenceMode={referenceMode}
        showReferenceCta={showReferenceCta}
        catalogTotalCount={catalogTotalCount}
        enableServerPagination={enableServerPagination}
      />
    </CatalogFulfillmentProvider>
  );
}

function TransactionalCatalogInner({
  store,
  products,
  storeCategories = [],
  exchangeRate,
  purchaseInfo,
  catalogDesign,
  catalogCurrency,
  openCheckoutInitially = false,
  previewMode = false,
  referenceMode = false,
  showReferenceCta = false,
  catalogTotalCount,
  enableServerPagination = false,
}: Omit<TransactionalCatalogProps, "locations" | "locationStocks">) {
  const liveExchangeRate = exchangeRate?.rate ?? null;
  const { showOfficialRate, showBsConversion } = catalogCurrency;
  const wholesaleEnabled = catalogCurrency.wholesaleEnabled;
  const { addItem } = useCart();

  return (
    <CatalogProductDetailHost
      exchangeRate={liveExchangeRate}
      showBsConversion={showBsConversion}
      storeRubro={store.rubro_tienda}
      wholesaleEnabled={wholesaleEnabled}
      onAddToCart={referenceMode ? undefined : addItem}
    >
      <TransactionalCatalogContent
        store={store}
        products={products}
        storeCategories={storeCategories}
        exchangeRate={exchangeRate}
        purchaseInfo={purchaseInfo}
        catalogDesign={catalogDesign}
        catalogCurrency={catalogCurrency}
        openCheckoutInitially={openCheckoutInitially}
        previewMode={previewMode}
        referenceMode={referenceMode}
        showReferenceCta={showReferenceCta}
        catalogTotalCount={catalogTotalCount}
        enableServerPagination={enableServerPagination}
        liveExchangeRate={liveExchangeRate}
        showOfficialRate={showOfficialRate}
        showBsConversion={showBsConversion}
        wholesaleEnabled={wholesaleEnabled}
        addItem={addItem}
      />
    </CatalogProductDetailHost>
  );
}

function TransactionalCatalogContent({
  store,
  products,
  storeCategories = [],
  exchangeRate,
  purchaseInfo,
  catalogDesign,
  catalogCurrency,
  openCheckoutInitially = false,
  previewMode = false,
  referenceMode = false,
  showReferenceCta = false,
  catalogTotalCount,
  enableServerPagination = false,
  liveExchangeRate,
  showOfficialRate,
  showBsConversion,
  wholesaleEnabled,
  addItem,
}: Omit<TransactionalCatalogProps, "locations" | "locationStocks"> & {
  liveExchangeRate: number | null;
  showOfficialRate: boolean;
  showBsConversion: boolean;
  wholesaleEnabled: boolean;
  addItem: ReturnType<typeof useCart>["addItem"];
}) {
  const { openProduct } = useCatalogProductDetail();
  const { getAvailableStock } = useCatalogFulfillment();
  const isFoodMenu = storeUsesRubroProductModule(store.rubro_tienda, "alimentos");
  const isTechCatalog = storeUsesRubroProductModule(
    store.rubro_tienda,
    "tecnologia",
  );
  const isCollectiblesCatalog = storeUsesRubroProductModule(
    store.rubro_tienda,
    "coleccionables",
  );
  const isBeautyCatalog = storeUsesRubroProductModule(
    store.rubro_tienda,
    "salud-belleza",
  );
  const isStationeryCatalog = storeUsesRubroProductModule(
    store.rubro_tienda,
    "papeleria-libreria-oficina",
  );

  const catalogProducts = useMemo(
    () =>
      products.map((product) =>
        applyLocationStockToProduct(product, getAvailableStock),
      ),
    [products, getAvailableStock],
  );

  const categoryOptions = useMemo(
    () => resolveCategoryOptions(storeCategories, catalogProducts),
    [storeCategories, catalogProducts],
  );

  const browseServerPagination = useMemo(
    () =>
      enableServerPagination && !previewMode
        ? {
            storeSlug: store.slug,
            initialTotalCount: catalogTotalCount ?? catalogProducts.length,
          }
        : undefined,
    [
      catalogProducts.length,
      catalogTotalCount,
      enableServerPagination,
      previewMode,
      store.slug,
    ],
  );

  const browse = useCatalogBrowse(catalogProducts, {
    serverPagination: browseServerPagination,
  });

  const useFlatBrowseLayout =
    !isFoodMenu || browse.hasActiveFilters || catalogProducts.length > 20;

  const menuSections = useMemo(() => {
    if (!isFoodMenu || useFlatBrowseLayout) return [];
    return groupProductsByFoodMenu(browse.filteredProducts);
  }, [browse.filteredProducts, isFoodMenu, useFlatBrowseLayout]);

  const storeInitials = getStoreInitials(store.name);

  const renderProductCard = useCallback(
    (product: CatalogListItem, index: number) => (
      <div
        key={product.product_id}
        className={
          referenceMode && previewMode ? "catalog-preview-product-enter" : undefined
        }
        style={
          referenceMode && previewMode
            ? { animationDelay: `${index * 40}ms` }
            : undefined
        }
      >
        <ProductCard
          product={product}
          exchangeRate={liveExchangeRate}
          showBsConversion={showBsConversion}
          catalogVisibility={catalogDesign.visibility}
          referenceCatalog={referenceMode && previewMode}
          storeRubro={store.rubro_tienda}
          wholesaleEnabled={wholesaleEnabled}
          onAddToCart={referenceMode ? undefined : addItem}
          onOpenDetail={openProduct}
        />
      </div>
    ),
    [
      addItem,
      catalogDesign.visibility,
      liveExchangeRate,
      previewMode,
      referenceMode,
      showBsConversion,
      store.rubro_tienda,
      wholesaleEnabled,
      openProduct,
    ],
  );

  const gridClassName =
    catalogDesign.layout === "list" ? "txn-product-list" : "txn-product-grid";

  return (
    <div
      className={cn(
        "txn-catalog",
        getCatalogDesignClasses(catalogDesign, store.rubro_tienda),
        isFoodMenu && "txn-catalog--food-menu",
        isTechCatalog && "txn-catalog--tech",
        isCollectiblesCatalog && "txn-catalog--collectibles",
        isBeautyCatalog && "txn-catalog--beauty",
        isStationeryCatalog && "txn-catalog--stationery",
        previewMode && "txn-catalog--preview",
        previewMode && referenceMode && "txn-catalog--reference-mode",
      )}
      style={getCatalogThemeStyle(catalogDesign, store.rubro_tienda)}
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
                <p className="txn-catalog-eyebrow">
                  {isFoodMenu
                    ? "Menú"
                    : isTechCatalog
                      ? "Tech"
                      : isCollectiblesCatalog
                        ? "Colección"
                        : isStationeryCatalog
                          ? "Papelería"
                          : "Catálogo"}
                </p>
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

      {!previewMode ? <CatalogLocationPicker /> : null}

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
              No encontramos productos con esos filtros
            </p>
            <p className="mt-1.5 text-xs text-neutral-500">
              Prueba otra búsqueda o limpia los filtros.
            </p>
          </div>
        ) : useFlatBrowseLayout ? (
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
              {browse.visibleProducts.map((product, index) =>
                renderProductCard(product, index),
              )}
              {previewMode && referenceMode && showReferenceCta ? (
                <div
                  className="catalog-preview-product-enter"
                  style={{
                    animationDelay: `${browse.visibleProducts.length * 40}ms`,
                  }}
                >
                  <CatalogUploadCtaCard />
                </div>
              ) : null}
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
        ) : (
          <div className="food-menu">
            {menuSections.map((section) => (
              <section
                key={section.slug}
                className="food-menu-section"
                aria-labelledby={`food-section-${section.slug}`}
              >
                <div className="food-menu-section-header">
                  <h2
                    id={`food-section-${section.slug}`}
                    className="food-menu-section-title"
                  >
                    {section.name}
                  </h2>
                </div>
                <div
                  className={
                    catalogDesign.layout === "list"
                      ? "txn-product-list"
                      : "txn-product-grid food-menu-grid"
                  }
                >
                  {section.products.map((product, index) =>
                    renderProductCard(product, index),
                  )}
                </div>
              </section>
            ))}
            {previewMode && referenceMode && showReferenceCta ? (
              <CatalogUploadCtaCard />
            ) : null}
          </div>
        )}
      </main>

      {!previewMode ? (
        <CatalogCartHost
          store={store}
          purchaseInfo={purchaseInfo}
          exchangeRate={liveExchangeRate}
          showOfficialRate={showOfficialRate}
          showBsConversion={showBsConversion}
          openInitially={openCheckoutInitially}
        />
      ) : null}
    </div>
  );
}
