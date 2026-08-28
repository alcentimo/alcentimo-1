"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CatalogListItem, ExchangeRate, Store } from "@/lib/database.types";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import type {
  CatalogDesignSettings,
  CatalogCurrencySettings,
} from "@/lib/store-settings/types";
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
import { useCart } from "@/components/catalog-transactional/CartProvider";
import {
  CatalogCartHost,
  type CartPanelView,
} from "@/components/catalog-transactional/CatalogCartHost";
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
import { StorefrontMoricheChrome } from "@/components/catalog-transactional/StorefrontMoricheChrome";
import { useOpenCatalogProductById } from "@/components/catalog-transactional/useOpenCatalogProductById";
import { mapCatalogListItemToMercadoCard } from "@/lib/catalog/map-catalog-to-mercado-card";
import { applyLocationStockToProduct } from "@/lib/locations/apply-catalog-stock";
import { normalizeCatalogHeaderSettings } from "@/lib/store-settings/catalog-header";
import { cn } from "@/lib/cn";
import type { MercadoProductCard } from "@/lib/mercado-oculto/types";

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
  const { showOfficialRate, showBsConversion, wholesaleEnabled } =
    catalogCurrency;
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
    () => resolveAutomaticStorefrontCategories(storeCategories, catalogProducts),
    [storeCategories, catalogProducts],
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
        liveExchangeRate={liveExchangeRate}
        catalogProducts={catalogProducts}
        categoryOptions={categoryOptions}
        browse={browse}
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
  liveExchangeRate: number | null;
  catalogProducts: CatalogListItem[];
  categoryOptions: CatalogCategoryOption[];
  browse: ReturnType<typeof useCatalogBrowse>;
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
  liveExchangeRate,
  catalogProducts,
  categoryOptions,
  browse,
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

  const handleActivateProduct = useCallback(
    (card: MercadoProductCard) => {
      const product = productById.get(card.product_id);
      if (product) openProduct(product);
    },
    [openProduct, productById],
  );

  const header = normalizeCatalogHeaderSettings(catalogDesign.header);
  const coverUrl = header.coverImageUrl?.startsWith("http")
    ? header.coverImageUrl
    : null;

  return (
    <div
      className={cn(
        "txn-catalog txn-catalog--moriche-native",
        getCatalogDesignClasses(catalogDesign, store.rubro_tienda),
      )}
      style={getCatalogThemeStyle(catalogDesign, store.rubro_tienda)}
    >
      <StorefrontMoricheChrome
        storeSlug={store.slug}
        storeName={store.name}
        storeDescription={store.description}
        logoUrl={store.logo_url}
        primaryColor={catalogDesign.primaryColor}
        eyebrow="Categorías"
        searchQuery={browse.searchQuery}
        onSearchQueryChange={browse.setSearchQuery}
        categories={categoryOptions}
        activeCategoryId={browse.categorySlug}
        onSelectCategory={browse.setCategorySlug}
        pending={browse.loadingFilter}
        banner={
          <>
            {coverUrl ? (
              <div className="storefront-mo-cover-banner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverUrl} alt="" className="storefront-mo-cover-img" />
              </div>
            ) : null}
            <CatalogPromoBannerCarousel
              promoBanner={catalogDesign.promoBanner}
              storeName={store.name}
              storeSlug={store.slug}
              onOpenProduct={openProductById}
            />
            <CatalogLocationPicker />
          </>
        }
      >
        <StorefrontCatalogListing
          browse={browse}
          catalogProducts={catalogProducts}
          categoryOptions={categoryOptions}
          mercadoCards={mercadoCards}
          onActivateProduct={handleActivateProduct}
          exchangeRate={exchangeRate}
          showOfficialRate={showOfficialRate}
          showBsConversion={showBsConversion}
          emptyTitle="No hay productos disponibles"
          emptyDescription="Vuelve pronto para ver el catálogo actualizado."
          noResultsTitle="No hay productos en esta categoría"
          noResultsDescription="Prueba otra categoría o limpia los filtros."
        />
      </StorefrontMoricheChrome>

      <CatalogCartHost
        store={store}
        purchaseInfo={purchaseInfo}
        exchangeRate={liveExchangeRate}
        showOfficialRate={catalogCurrency.showOfficialRate}
        showBsConversion={showBsConversion}
        panelView={cartPanelView}
        onPanelViewChange={handleCartPanelViewChange}
        showFab={false}
      />
    </div>
  );
}
