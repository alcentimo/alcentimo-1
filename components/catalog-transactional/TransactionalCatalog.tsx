"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CatalogListItem, ExchangeRate, Store } from "@/lib/database.types";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import type { CatalogDesignSettings, CatalogCurrencySettings } from "@/lib/store-settings/types";
import {
  resolveStorefrontCatalogCategories,
  extractCatalogCategories,
  type CatalogCategoryOption,
} from "@/lib/catalog/extract-categories";
import type { StoreLocation, VariantLocationStock } from "@/lib/locations/types";
import {
  getCatalogDesignClasses,
  getCatalogProductGridClassName,
  getCatalogThemeStyle,
  resolveCatalogDesign,
} from "@/lib/store-settings/catalog-theme";
import { ProductCard } from "@/components/catalog/ProductCard";
import {
  CatalogProductDetailHost,
  useCatalogProductDetail,
} from "@/components/catalog/CatalogProductDetailHost";
import { CatalogUploadCtaCard } from "@/components/catalog/CatalogUploadCtaCard";
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
import { useCatalogLayoutPreference } from "@/components/catalog-transactional/useCatalogLayoutPreference";
import {
  CatalogFulfillmentProvider,
  useCatalogFulfillment,
} from "@/components/catalog-transactional/CatalogFulfillmentProvider";
import { CatalogLocationPicker } from "@/components/catalog-transactional/CatalogLocationPicker";
import { CatalogPromoBannerCarousel } from "@/components/catalog-transactional/CatalogPromoBannerCarousel";
import { CatalogStoreIdentityHeader } from "@/components/catalog-transactional/CatalogStoreIdentityHeader";
import { CatalogFaqSection } from "@/components/catalog-transactional/CatalogFaqSection";
import { useOpenCatalogProductById } from "@/components/catalog-transactional/useOpenCatalogProductById";
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
  openCartInitially?: boolean;
  /** Abre la ficha de producto al cargar (`?product=`). */
  initialProductId?: string | null;
  previewMode?: boolean;
  /**
   * Muestra el carrito aunque `previewMode` esté activo
   * (sandbox de landing / demos interactivas).
   */
  enableCart?: boolean;
  referenceMode?: boolean;
  showReferenceCta?: boolean;
  locations?: StoreLocation[];
  locationStocks?: VariantLocationStock[];
  /** Total de productos en BD (catálogo público paginado). */
  catalogTotalCount?: number;
  enableServerPagination?: boolean;
}

function resolveCategoryOptions(
  storeCategories: CatalogCategoryOption[],
  products: CatalogListItem[],
  storeRubro: string | null | undefined,
): CatalogCategoryOption[] {
  // Confiar en la lista del servidor (ya filtrada por rubro). No usar la 1ª
  // página de productos como fuente de chips — reintroduce ropa/muebles huérfanos.
  if (storeCategories.length > 0) {
    return resolveStorefrontCatalogCategories(
      storeCategories,
      storeCategories,
      storeRubro,
    );
  }
  return resolveStorefrontCatalogCategories(
    [],
    extractCatalogCategories(products),
    storeRubro,
    products,
  );
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
  openCartInitially = false,
  initialProductId = null,
  previewMode = false,
  enableCart = false,
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
        openCartInitially={openCartInitially}
        initialProductId={initialProductId}
        previewMode={previewMode}
        enableCart={enableCart}
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
  openCartInitially = false,
  initialProductId = null,
  previewMode = false,
  enableCart = false,
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
        openCartInitially={openCartInitially}
        initialProductId={initialProductId}
        previewMode={previewMode}
        enableCart={enableCart}
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
  openCartInitially = false,
  initialProductId = null,
  previewMode = false,
  enableCart = false,
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
  const openProductById = useOpenCatalogProductById(
    store.slug,
    products,
    previewMode ? null : initialProductId,
  );
  const { getAvailableStock } = useCatalogFulfillment();
  const shellNav = useCatalogShellNavigationOptional();
  const [cartPanelView, setCartPanelView] = useState<CartPanelView>(() => {
    if (openCheckoutInitially) return "checkout";
    if (openCartInitially) return "summary";
    return "closed";
  });

  const openCartSummary = useCallback(() => {
    setCartPanelView("summary");
  }, []);

  const closeCart = useCallback(() => {
    setCartPanelView("closed");
  }, []);

  useRegisterCatalogCartController(openCartSummary, closeCart);

  useEffect(() => {
    if (openCheckoutInitially) {
      setCartPanelView("checkout");
      return;
    }
    if (openCartInitially) {
      setCartPanelView("summary");
    }
  }, [openCheckoutInitially, openCartInitially]);

  useEffect(() => {
    shellNav?.setCartActive(cartPanelView !== "closed");
  }, [cartPanelView, shellNav]);

  const handleCartPanelViewChange = useCallback((view: CartPanelView) => {
    setCartPanelView(view);
  }, []);
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
    () =>
      resolveCategoryOptions(
        storeCategories,
        catalogProducts,
        store.rubro_tienda,
      ),
    [storeCategories, catalogProducts, store.rubro_tienda],
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

  const storeDefaultLayout = resolveCatalogDesign(
    catalogDesign,
    store.rubro_tienda,
  ).layout;
  const { layout: preferredLayout, setLayout: setPreferredLayout } =
    useCatalogLayoutPreference(store.slug, storeDefaultLayout);

  const effectiveDesign = useMemo(
    () => ({ ...catalogDesign, layout: preferredLayout }),
    [catalogDesign, preferredLayout],
  );

  const useFlatBrowseLayout =
    !isFoodMenu || browse.hasActiveFilters || catalogProducts.length > 20;

  const menuSections = useMemo(() => {
    if (!isFoodMenu || useFlatBrowseLayout) return [];
    return groupProductsByFoodMenu(browse.filteredProducts);
  }, [browse.filteredProducts, isFoodMenu, useFlatBrowseLayout]);

  const identityEyebrow = isFoodMenu
    ? "Menú"
    : isTechCatalog
      ? "Tech"
      : isCollectiblesCatalog
        ? "Colección"
        : isStationeryCatalog
          ? "Papelería"
          : "Catálogo";

  const renderProductCard = useCallback(
    (product: CatalogListItem, index: number) => (
      <div
        key={product.product_id}
        className={cn(
          "w-full min-w-0",
          referenceMode && previewMode && "catalog-preview-product-enter",
        )}
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

  const gridClassName = getCatalogProductGridClassName(
    effectiveDesign,
    store.rubro_tienda,
  );

  return (
    <div
      className={cn(
        "txn-catalog",
        getCatalogDesignClasses(effectiveDesign, store.rubro_tienda),
        isFoodMenu && "txn-catalog--food-menu",
        isTechCatalog && "txn-catalog--tech",
        isCollectiblesCatalog && "txn-catalog--collectibles",
        isBeautyCatalog && "txn-catalog--beauty",
        isStationeryCatalog && "txn-catalog--stationery",
        previewMode && "txn-catalog--preview",
        previewMode && referenceMode && "txn-catalog--reference-mode",
      )}
      style={getCatalogThemeStyle(effectiveDesign, store.rubro_tienda)}
    >
      <CatalogStoreIdentityHeader
        storeName={store.name}
        storeDescription={store.description}
        logoUrl={store.logo_url}
        eyebrow={identityEyebrow}
        locationHours={purchaseInfo.locationHours}
        showOfficialRate={showOfficialRate}
        exchangeRate={exchangeRate?.rate ?? null}
      />

      <CatalogPromoBannerCarousel
        promoBanner={catalogDesign.promoBanner}
        storeName={store.name}
        storeSlug={store.slug}
        onOpenProduct={previewMode ? undefined : openProductById}
      />

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
          layout={preferredLayout}
          onLayoutChange={setPreferredLayout}
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
                  className={getCatalogProductGridClassName(
                    effectiveDesign,
                    store.rubro_tienda,
                    "food-menu-grid",
                  )}
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

      <CatalogFaqSection
        faq={effectiveDesign.faq ?? catalogDesign.faq}
        storeName={store.name}
      />

      {!previewMode || enableCart ? (
        <CatalogCartHost
          store={store}
          purchaseInfo={purchaseInfo}
          exchangeRate={liveExchangeRate}
          showOfficialRate={showOfficialRate}
          showBsConversion={showBsConversion}
          panelView={cartPanelView}
          onPanelViewChange={handleCartPanelViewChange}
          sandboxMode={enableCart && previewMode}
        />
      ) : null}
    </div>
  );
}
