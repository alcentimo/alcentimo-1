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
import { StorefrontCoverBanner } from "@/components/catalog-transactional/StorefrontCoverBanner";
import { StorefrontMoricheChrome } from "@/components/catalog-transactional/StorefrontMoricheChrome";
import { mapCatalogListItemToMercadoCard } from "@/lib/catalog/map-catalog-to-mercado-card";
import { officialBrandsToCatalogOptions } from "@/lib/catalog/product-brand";
import type { OfficialBrandPublic } from "@/lib/official-brands/types";
import { applyLocationStockToProduct } from "@/lib/locations/apply-catalog-stock";
import { normalizeCatalogHeaderSettings } from "@/lib/store-settings/catalog-header";
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
  featuredBrands?: OfficialBrandPublic[];
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
  featuredBrands = [],
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
        featuredBrands={featuredBrands}
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
  featuredBrands = [],
}: Omit<CatalogCategoriesViewProps, "locations" | "locationStocks">) {
  const liveExchangeRate = exchangeRate?.rate ?? null;
  const { showOfficialRate, showBsConversion } = catalogCurrency;
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

  const handleSelectBrand = useCallback(
    (brand: string | null) => {
      browse.setBrand(brand);
      if (typeof document !== "undefined" && brand) {
        document
          .getElementById("storefront-resultados")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [browse.setBrand],
  );

  return (
      <CatalogCategoriesPageContent
        store={store}
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
      onSelectBrand={handleSelectBrand}
      featuredBrands={featuredBrands}
    />
  );
}

interface CatalogCategoriesPageContentProps {
  store: Store;
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
  onSelectBrand: (brand: string | null) => void;
  featuredBrands: OfficialBrandPublic[];
}

function CatalogCategoriesPageContent({
  store,
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
  onSelectBrand,
  featuredBrands,
}: CatalogCategoriesPageContentProps) {
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

  const brandOptions = useMemo(
    () => officialBrandsToCatalogOptions(featuredBrands),
    [featuredBrands],
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
        brands={brandOptions}
        activeBrand={browse.brand}
        onSelectBrand={onSelectBrand}
        pending={browse.loadingFilter}
        banner={
          <>
            <StorefrontCoverBanner url={coverUrl} storeName={store.name} />
            <CatalogPromoBannerCarousel
              promoBanner={catalogDesign.promoBanner}
              storeName={store.name}
              storeSlug={store.slug}
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
          storeSlug={store.slug}
          onSelectBrand={onSelectBrand}
          featuredBrands={brandOptions}
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
