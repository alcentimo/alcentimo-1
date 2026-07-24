"use client";

import { useMemo } from "react";
import Image from "next/image";
import type { CatalogListItem, ExchangeRate, Store } from "@/lib/database.types";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import type { CatalogDesignSettings, CatalogCurrencySettings } from "@/lib/store-settings/types";
import type { CatalogCategoryOption } from "@/lib/catalog/extract-categories";
import type { StoreLocation, VariantLocationStock } from "@/lib/locations/types";
import { extractCatalogCategories } from "@/lib/catalog/extract-categories";
import {
  getCatalogDesignClasses,
  getCatalogThemeStyle,
} from "@/lib/store-settings/catalog-theme";
import { formatExchangeRate } from "@/lib/format";
import { ProductCard } from "@/components/catalog/ProductCard";
import { CatalogUploadCtaCard } from "@/components/catalog/CatalogUploadCtaCard";
import { StoreOpenBadge } from "@/components/catalog/StoreOpenBadge";
import { useCart } from "@/components/catalog-transactional/CartProvider";
import { CatalogCartHost } from "@/components/catalog-transactional/CatalogCartHost";
import { CatalogBrowseToolbar } from "@/components/catalog-transactional/CatalogBrowseToolbar";
import { CatalogBrowseLoadMore } from "@/components/catalog-transactional/CatalogBrowseLoadMore";
import { useCatalogBrowse } from "@/components/catalog-transactional/useCatalogBrowse";
import {
  CatalogFulfillmentProvider,
  useCatalogFulfillment,
} from "@/components/catalog-transactional/CatalogFulfillmentProvider";
import { CatalogLocationPicker } from "@/components/catalog-transactional/CatalogLocationPicker";
import { applyLocationStockToProduct } from "@/lib/locations/apply-catalog-stock";
import { isProductOutOfStock } from "@/lib/products/variants";
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
  if (storeCategories.length > 0) return storeCategories;
  return extractCatalogCategories(products);
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
  const { addItem } = useCart();
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
    () => resolveCategoryOptions(storeCategories, availableProducts),
    [storeCategories, availableProducts],
  );

  const browse = useCatalogBrowse(availableProducts, {
    serverPagination:
      enableServerPagination && !previewMode
        ? {
            storeSlug: store.slug,
            initialTotalCount: catalogTotalCount ?? availableProducts.length,
          }
        : undefined,
  });

  const useFlatBrowseLayout =
    !isFoodMenu || browse.hasActiveFilters || availableProducts.length > 20;

  const menuSections = useMemo(() => {
    if (!isFoodMenu || useFlatBrowseLayout) return [];
    return groupProductsByFoodMenu(browse.filteredProducts);
  }, [browse.filteredProducts, isFoodMenu, useFlatBrowseLayout]);

  const storeInitials = getStoreInitials(store.name);

  function renderProductCard(product: CatalogListItem, index: number) {
    return (
      <div
        key={product.product_id}
        className={
          referenceMode && previewMode
            ? "catalog-preview-product-enter"
            : undefined
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
          onAddToCart={referenceMode ? undefined : addItem}
        />
      </div>
    );
  }

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

      {!previewMode ? (
        <div className="txn-catalog-header-inner px-0 pb-0 pt-3">
          <CatalogLocationPicker />
        </div>
      ) : null}

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
        ) : browse.totalCount === 0 ? (
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
            <div className={gridClassName}>
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
              error={browse.fetchError}
              onLoadMore={browse.loadMore}
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
          openInitially={openCheckoutInitially}
        />
      ) : null}
    </div>
  );
}
