"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import type { CatalogListItem, ExchangeRate, Store } from "@/lib/database.types";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import type { CatalogDesignSettings, CatalogCurrencySettings } from "@/lib/store-settings/types";
import {
  resolveAutomaticStorefrontCategories,
  type CatalogCategoryOption,
} from "@/lib/catalog/extract-categories";
import type { StoreLocation, VariantLocationStock } from "@/lib/locations/types";
import {
  getCatalogDesignClasses,
  getCatalogThemeStyle,
} from "@/lib/store-settings/catalog-theme";
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
import { useCatalogBrowse } from "@/components/catalog-transactional/useCatalogBrowse";
import {
  CatalogFulfillmentProvider,
  useCatalogFulfillment,
} from "@/components/catalog-transactional/CatalogFulfillmentProvider";
import { CatalogLocationPicker } from "@/components/catalog-transactional/CatalogLocationPicker";
import { CatalogPromoBannerCarousel } from "@/components/catalog-transactional/CatalogPromoBannerCarousel";
import { StorefrontCatalogListing } from "@/components/catalog-transactional/StorefrontCatalogListing";
import { StorefrontCoverBanner } from "@/components/catalog-transactional/StorefrontCoverBanner";
import { StorefrontMoricheChrome } from "@/components/catalog-transactional/StorefrontMoricheChrome";
import { CatalogFaqSection } from "@/components/catalog-transactional/CatalogFaqSection";
import { useOpenCatalogProductById } from "@/components/catalog-transactional/useOpenCatalogProductById";
import { mapCatalogListItemToMercadoCard } from "@/lib/catalog/map-catalog-to-mercado-card";
import { officialBrandsToCatalogOptions } from "@/lib/catalog/product-brand";
import type { OfficialBrandPublic } from "@/lib/official-brands/types";
import { applyLocationStockToProduct } from "@/lib/locations/apply-catalog-stock";
import { storeUsesRubroProductModule } from "@/lib/rubros/registry";
import { normalizeCatalogHeaderSettings } from "@/lib/store-settings/catalog-header";
import { cn } from "@/lib/cn";
import type { MercadoProductCard } from "@/lib/mercado-oculto/types";

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
  featuredBrands?: OfficialBrandPublic[];
  /** Prefill del buscador (`?q=` desde la ficha de producto). */
  initialSearchQuery?: string | null;
  initialBrand?: string | null;
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
  featuredBrands = [],
  initialSearchQuery = null,
  initialBrand = null,
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
        featuredBrands={featuredBrands}
        initialSearchQuery={initialSearchQuery}
        initialBrand={initialBrand}
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
  featuredBrands = [],
  initialSearchQuery = null,
  initialBrand = null,
}: Omit<TransactionalCatalogProps, "locations" | "locationStocks">) {
  const liveExchangeRate = exchangeRate?.rate ?? null;
  const { showOfficialRate, showBsConversion } = catalogCurrency;
  const wholesaleEnabled = catalogCurrency.wholesaleEnabled;
  const { addItem } = useCart();
  const brandFilterRef = useRef<(brand: string) => void>(() => {});

  return (
    <CatalogProductDetailHost
      storeId={store.id}
      storeSlug={store.slug}
      exchangeRate={liveExchangeRate}
      showBsConversion={showBsConversion}
      showOfficialRate={showOfficialRate}
      storeRubro={store.rubro_tienda}
      wholesaleEnabled={false}
      checkoutType={purchaseInfo.checkoutType}
      whatsappPhone={purchaseInfo.whatsappPhone}
      syncProductUrl={!previewMode}
      onAddToCart={referenceMode ? undefined : addItem}
      onSelectBrand={(brand) => brandFilterRef.current(brand)}
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
        featuredBrands={featuredBrands}
        initialSearchQuery={initialSearchQuery}
        initialBrand={initialBrand}
        liveExchangeRate={liveExchangeRate}
        showOfficialRate={showOfficialRate}
        showBsConversion={showBsConversion}
        wholesaleEnabled={wholesaleEnabled}
        addItem={addItem}
        brandFilterRef={brandFilterRef}
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
  catalogCurrency: _catalogCurrency,
  openCheckoutInitially = false,
  openCartInitially = false,
  initialProductId = null,
  previewMode = false,
  enableCart = false,
  referenceMode = false,
  showReferenceCta = false,
  catalogTotalCount,
  enableServerPagination = false,
  featuredBrands = [],
  initialSearchQuery = null,
  initialBrand = null,
  liveExchangeRate,
  showOfficialRate,
  showBsConversion,
  wholesaleEnabled: _wholesaleEnabled,
  addItem: _addItem,
  brandFilterRef,
}: Omit<TransactionalCatalogProps, "locations" | "locationStocks"> & {
  liveExchangeRate: number | null;
  showOfficialRate: boolean;
  showBsConversion: boolean;
  wholesaleEnabled: boolean;
  addItem: ReturnType<typeof useCart>["addItem"];
  brandFilterRef: MutableRefObject<(brand: string) => void>;
}) {
  const { openProduct, closeProduct } = useCatalogProductDetail();
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
    () => resolveAutomaticStorefrontCategories(storeCategories, catalogProducts),
    [storeCategories, catalogProducts],
  );

  const brandOptions = useMemo(
    () => officialBrandsToCatalogOptions(featuredBrands),
    [featuredBrands],
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
    initialSearchQuery,
    initialBrand,
  });

  const effectiveDesign = catalogDesign;

  const identityEyebrow = isFoodMenu
    ? "Menú"
    : isTechCatalog
      ? "Tech"
      : isCollectiblesCatalog
        ? "Colección"
        : isStationeryCatalog
          ? "Papelería"
          : "Catálogo";

  const mercadoCards = useMemo(
    () =>
      browse.visibleProducts.map((product) =>
        mapCatalogListItemToMercadoCard(product, store.name),
      ),
    [browse.visibleProducts, store.name],
  );

  const productById = useMemo(() => {
    const map = new Map<string, CatalogListItem>();
    for (const product of catalogProducts) {
      map.set(product.product_id, product);
    }
    return map;
  }, [catalogProducts]);

  const handleSelectBrand = useCallback(
    (nextBrand: string | null) => {
      browse.setBrand(nextBrand);
      if (previewMode) closeProduct();
      if (typeof document !== "undefined") {
        document
          .getElementById("storefront-resultados")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [browse.setBrand, closeProduct, previewMode],
  );

  brandFilterRef.current = (brand) => {
    handleSelectBrand(brand);
  };

  const handleActivateProduct = useCallback(
    (card: MercadoProductCard) => {
      const product = productById.get(card.product_id);
      if (product) openProduct(product);
    },
    [openProduct, productById],
  );

  const header = normalizeCatalogHeaderSettings(
    effectiveDesign.header ?? catalogDesign.header,
  );
  const coverUrl = header.coverImageUrl?.startsWith("http")
    ? header.coverImageUrl
    : null;

  return (
    <div
      className={cn(
        "txn-catalog txn-catalog--moriche-native",
        getCatalogDesignClasses(effectiveDesign, store.rubro_tienda),
        previewMode && "txn-catalog--preview",
        previewMode && referenceMode && "txn-catalog--reference-mode",
      )}
      style={getCatalogThemeStyle(effectiveDesign, store.rubro_tienda)}
    >
      <StorefrontMoricheChrome
        storeSlug={store.slug}
        storeName={store.name}
        storeDescription={store.description}
        logoUrl={store.logo_url}
        primaryColor={effectiveDesign.primaryColor}
        eyebrow={identityEyebrow}
        searchQuery={browse.searchQuery}
        onSearchQueryChange={browse.setSearchQuery}
        categories={categoryOptions}
        activeCategoryId={browse.categorySlug}
        onSelectCategory={browse.setCategorySlug}
        brands={brandOptions}
        activeBrand={browse.brand}
        onSelectBrand={handleSelectBrand}
        pending={browse.loadingFilter}
        banner={
          <>
            <StorefrontCoverBanner url={coverUrl} storeName={store.name} />
            <CatalogPromoBannerCarousel
              promoBanner={catalogDesign.promoBanner}
              storeName={store.name}
              storeSlug={store.slug}
              onOpenProduct={previewMode ? openProductById : undefined}
            />
            {!previewMode ? <CatalogLocationPicker /> : null}
          </>
        }
      >
        <StorefrontCatalogListing
          browse={browse}
          catalogProducts={catalogProducts}
          categoryOptions={categoryOptions}
          mercadoCards={mercadoCards}
          storeSlug={store.slug}
          onActivateProduct={previewMode ? handleActivateProduct : undefined}
          onSelectBrand={handleSelectBrand}
          featuredBrands={brandOptions}
          exchangeRate={exchangeRate}
          showOfficialRate={showOfficialRate}
          showBsConversion={showBsConversion}
          emptyTitle="No hay productos disponibles"
          emptyDescription="Vuelve pronto para ver el catálogo actualizado."
          noResultsTitle="No encontramos productos con esos filtros"
          noResultsDescription="Prueba otra búsqueda o limpia los filtros."
          extraAfterGrid={
            previewMode && referenceMode && showReferenceCta ? (
              <div className="mt-4">
                <CatalogUploadCtaCard />
              </div>
            ) : null
          }
        />

        <CatalogFaqSection
          faq={effectiveDesign.faq ?? catalogDesign.faq}
          storeName={store.name}
        />
      </StorefrontMoricheChrome>

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
          showFab={false}
        />
      ) : null}
    </div>
  );
}
