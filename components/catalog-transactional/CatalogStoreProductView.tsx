"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { CatalogListItem, ExchangeRate, Store } from "@/lib/database.types";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import type {
  CatalogCurrencySettings,
  CatalogDesignSettings,
} from "@/lib/store-settings/types";
import type { StoreLocation, VariantLocationStock } from "@/lib/locations/types";
import type { CatalogCategoryOption } from "@/lib/catalog/extract-categories";
import { resolveAutomaticStorefrontCategories } from "@/lib/catalog/extract-categories";
import { CatalogProductDetailPanel } from "@/components/catalog/CatalogProductDetailPanel";
import { useCart } from "@/components/catalog-transactional/CartProvider";
import {
  CatalogCartHost,
  type CartPanelView,
} from "@/components/catalog-transactional/CatalogCartHost";
import {
  useCatalogShellNavigationOptional,
  useRegisterCatalogCartController,
} from "@/components/catalog-transactional/CatalogShellNavigation";
import {
  CatalogFulfillmentProvider,
  useCatalogFulfillment,
} from "@/components/catalog-transactional/CatalogFulfillmentProvider";
import { StorefrontMoricheChrome } from "@/components/catalog-transactional/StorefrontMoricheChrome";
import { applyLocationStockToProduct } from "@/lib/locations/apply-catalog-stock";
import {
  getCatalogDesignClasses,
  getCatalogThemeStyle,
} from "@/lib/store-settings/catalog-theme";
import { getStoreCatalogBasePath } from "@/lib/store-host";
import { storeUsesRubroProductModule } from "@/lib/rubros/registry";
import { cn } from "@/lib/cn";

interface CatalogStoreProductViewProps {
  store: Store;
  product: CatalogListItem;
  products?: CatalogListItem[];
  storeCategories?: CatalogCategoryOption[];
  exchangeRate: ExchangeRate | null;
  purchaseInfo: PublicPurchaseInfo;
  catalogDesign: CatalogDesignSettings;
  catalogCurrency: CatalogCurrencySettings;
  locations?: StoreLocation[];
  locationStocks?: VariantLocationStock[];
}

function joinStorefrontPath(basePath: string, rest: string): string {
  const path = rest.startsWith("/") ? rest : `/${rest}`;
  if (basePath === "/") return path;
  return `${basePath}${path}`;
}

export function CatalogStoreProductView({
  store,
  product,
  products = [],
  storeCategories = [],
  exchangeRate,
  purchaseInfo,
  catalogDesign,
  catalogCurrency,
  locations = [],
  locationStocks = [],
}: CatalogStoreProductViewProps) {
  return (
    <CatalogFulfillmentProvider
      storeSlug={store.slug}
      locations={locations}
      locationStocks={locationStocks}
    >
      <CatalogStoreProductViewInner
        store={store}
        product={product}
        products={products}
        storeCategories={storeCategories}
        exchangeRate={exchangeRate}
        purchaseInfo={purchaseInfo}
        catalogDesign={catalogDesign}
        catalogCurrency={catalogCurrency}
      />
    </CatalogFulfillmentProvider>
  );
}

function CatalogStoreProductViewInner({
  store,
  product,
  products = [],
  storeCategories = [],
  exchangeRate,
  purchaseInfo,
  catalogDesign,
  catalogCurrency,
}: Omit<CatalogStoreProductViewProps, "locations" | "locationStocks">) {
  const pathname = usePathname();
  const router = useRouter();
  const liveExchangeRate = exchangeRate?.rate ?? null;
  const { showOfficialRate, showBsConversion } = catalogCurrency;
  const { addItem } = useCart();
  const { getAvailableStock } = useCatalogFulfillment();
  const shellNav = useCatalogShellNavigationOptional();
  const [cartPanelView, setCartPanelView] = useState<CartPanelView>("closed");
  const [searchQuery, setSearchQuery] = useState("");

  const catalogHref = getStoreCatalogBasePath(store.slug, { pathname });
  const stockedProduct = useMemo(
    () => applyLocationStockToProduct(product, getAvailableStock),
    [getAvailableStock, product],
  );

  const categoryOptions = useMemo(
    () => resolveAutomaticStorefrontCategories(storeCategories, products),
    [products, storeCategories],
  );

  const identityEyebrow = storeUsesRubroProductModule(
    store.rubro_tienda,
    "alimentos",
  )
    ? "Menú"
    : storeUsesRubroProductModule(store.rubro_tienda, "tecnologia")
      ? "Tech"
      : storeUsesRubroProductModule(store.rubro_tienda, "coleccionables")
        ? "Colección"
        : storeUsesRubroProductModule(
            store.rubro_tienda,
            "papeleria-libreria-oficina",
          )
          ? "Papelería"
          : "Catálogo";

  const goToCatalog = useCallback(
    (query?: { q?: string; marca?: string }) => {
      const params = new URLSearchParams();
      if (query?.q?.trim()) params.set("q", query.q.trim());
      if (query?.marca?.trim()) params.set("marca", query.marca.trim());
      const search = params.toString();
      router.push(search ? `${catalogHref}?${search}` : catalogHref);
    },
    [catalogHref, router],
  );

  const handleSelectCategory = useCallback(
    (categorySlug: string | null) => {
      if (!categorySlug) {
        goToCatalog();
        return;
      }
      const href = joinStorefrontPath(catalogHref, "/categorias");
      router.push(`${href}?categoria=${encodeURIComponent(categorySlug)}`);
    },
    [catalogHref, goToCatalog, router],
  );

  const handleSearchSubmit = useCallback(() => {
    goToCatalog({ q: searchQuery });
  }, [goToCatalog, searchQuery]);

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

  useEffect(() => {
    if (!store.id || !store.slug || !product.product_id) return;
    void fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "product",
        storeId: store.id,
        storeSlug: store.slug,
        productId: product.product_id,
      }),
      keepalive: true,
    }).catch(() => {
      // Silenciar errores de tracking.
    });
  }, [product.product_id, store.id, store.slug]);

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
        storeDescription={null}
        logoUrl={store.logo_url}
        primaryColor={catalogDesign.primaryColor}
        eyebrow={identityEyebrow}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        categories={categoryOptions}
        activeCategoryId={product.category_slug}
        onSelectCategory={handleSelectCategory}
        pinNavigation
      >
        <CatalogProductDetailPanel
          product={stockedProduct}
          layout="page"
          catalogHref={catalogHref}
          exchangeRate={liveExchangeRate}
          showBsConversion={showBsConversion}
          showOfficialRate={showOfficialRate}
          storeRubro={store.rubro_tienda}
          wholesaleEnabled={false}
          checkoutType={purchaseInfo.checkoutType}
          whatsappPhone={purchaseInfo.whatsappPhone}
          onAddToCart={addItem}
        />
      </StorefrontMoricheChrome>
      <CatalogCartHost
        store={store}
        purchaseInfo={purchaseInfo}
        exchangeRate={liveExchangeRate}
        showOfficialRate={showOfficialRate}
        showBsConversion={showBsConversion}
        panelView={cartPanelView}
        onPanelViewChange={setCartPanelView}
        showFab={false}
      />
    </div>
  );
}
