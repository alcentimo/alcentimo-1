"use client";

import { useState } from "react";
import Link from "next/link";
import type { CatalogListItem, ExchangeRate, Store } from "@/lib/database.types";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import type { CatalogCurrencySettings } from "@/lib/store-settings/types";
import type { StoreLocation, VariantLocationStock } from "@/lib/locations/types";
import { formatExchangeRate } from "@/lib/format";
import { StoreHeader } from "@/components/catalog/StoreHeader";
import { ProductCard } from "@/components/catalog/ProductCard";
import {
  CatalogProductDetailHost,
  useCatalogProductDetail,
} from "@/components/catalog/CatalogProductDetailHost";
import { PurchaseInfoPanel } from "@/components/catalog/PurchaseInfoPanel";
import { PageContainer } from "@/components/ui/PageContainer";
import { useCart } from "@/components/catalog-transactional/CartProvider";
import {
  CatalogCartHost,
  type CartPanelView,
} from "@/components/catalog-transactional/CatalogCartHost";
import {
  CatalogFulfillmentProvider,
} from "@/components/catalog-transactional/CatalogFulfillmentProvider";
import { CustomerPromoBanner } from "@/components/catalog-transactional/CustomerPromoBanner";
import { usePromotionContext } from "@/components/catalog-transactional/PromotionProvider";

interface StoreCatalogProps {
  store: Store;
  products: CatalogListItem[];
  exchangeRate: ExchangeRate | null;
  purchaseInfo: PublicPurchaseInfo;
  catalogCurrency: CatalogCurrencySettings;
  locations?: StoreLocation[];
  locationStocks?: VariantLocationStock[];
}

export function StoreCatalog({
  store,
  products,
  exchangeRate,
  purchaseInfo,
  catalogCurrency,
  locations = [],
  locationStocks = [],
}: StoreCatalogProps) {
  return (
    <CatalogFulfillmentProvider
      storeSlug={store.slug}
      locations={locations}
      locationStocks={locationStocks}
    >
      <StoreCatalogInner
        store={store}
        products={products}
        exchangeRate={exchangeRate}
        purchaseInfo={purchaseInfo}
        catalogCurrency={catalogCurrency}
      />
    </CatalogFulfillmentProvider>
  );
}

function StoreCatalogInner({
  store,
  products,
  exchangeRate,
  purchaseInfo,
  catalogCurrency,
}: Omit<StoreCatalogProps, "locations" | "locationStocks">) {
  const liveExchangeRate = exchangeRate?.rate ?? null;
  const { showOfficialRate, showBsConversion } = catalogCurrency;
  const { itemCount, addItem } = useCart();
  const { guestBanner } = usePromotionContext();
  const [cartPanelView, setCartPanelView] = useState<CartPanelView>("closed");

  return (
    <CatalogProductDetailHost
      exchangeRate={liveExchangeRate}
      showBsConversion={showBsConversion}
      storeRubro={store.rubro_tienda}
      onAddToCart={addItem}
    >
      <StoreCatalogContent
        store={store}
        products={products}
        exchangeRate={exchangeRate}
        purchaseInfo={purchaseInfo}
        showOfficialRate={showOfficialRate}
        showBsConversion={showBsConversion}
        liveExchangeRate={liveExchangeRate}
        itemCount={itemCount}
        guestBanner={guestBanner}
        cartPanelView={cartPanelView}
        setCartPanelView={setCartPanelView}
        addItem={addItem}
      />
    </CatalogProductDetailHost>
  );
}

function StoreCatalogContent({
  store,
  products,
  exchangeRate,
  purchaseInfo,
  showOfficialRate,
  showBsConversion,
  liveExchangeRate,
  itemCount,
  guestBanner,
  cartPanelView,
  setCartPanelView,
  addItem,
}: Omit<StoreCatalogProps, "locations" | "locationStocks" | "catalogCurrency"> & {
  showOfficialRate: boolean;
  showBsConversion: boolean;
  liveExchangeRate: number | null;
  itemCount: number;
  guestBanner: ReturnType<typeof usePromotionContext>["guestBanner"];
  cartPanelView: CartPanelView;
  setCartPanelView: (view: CartPanelView) => void;
  addItem: ReturnType<typeof useCart>["addItem"];
}) {
  const { openProduct } = useCatalogProductDetail();

  return (
    <div className="store-catalog-shell">
      <CustomerPromoBanner promotion={guestBanner} />

      <StoreHeader
        store={store}
        cartCount={itemCount}
        locationHours={purchaseInfo.locationHours}
        onCartClick={() => setCartPanelView("summary")}
      />

      <PageContainer className="store-catalog-main safe-area-inset">
        {store.description && (
          <p className="store-description">{store.description}</p>
        )}

        {showOfficialRate && exchangeRate && (
          <p className="store-rate-note">
            Tasa del día: Bs. {formatExchangeRate(exchangeRate.rate)} / USD
          </p>
        )}

        <div className="store-catalog-layout">
          <main className="store-catalog-products">
            {products.length === 0 ? (
              <div className="store-empty-state">
                <p className="text-base font-medium text-zinc-800">
                  Esta tienda aún no tiene productos
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  Vuelve pronto para ver novedades.
                </p>
              </div>
            ) : (
              <div className="store-product-grid">
                {products.map((product) => (
                  <ProductCard
                    key={product.product_id}
                    product={product}
                    exchangeRate={liveExchangeRate}
                    showBsConversion={showBsConversion}
                    storeRubro={store.rubro_tienda}
                    onAddToCart={addItem}
                    onOpenDetail={openProduct}
                  />
                ))}
              </div>
            )}
          </main>

          <PurchaseInfoPanel purchaseInfo={purchaseInfo} />
        </div>
      </PageContainer>

      <footer className="store-footer safe-area-bottom">
        <PageContainer className="flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-zinc-500">
            Catálogo de {store.name}
            {showBsConversion
              ? " · Precios en USD con referencia en bolívares."
              : " · Precios en USD."}
          </p>
          <Link href="/" className="text-xs font-medium text-zinc-700 hover:text-zinc-900">
            Creado con alcentimo
          </Link>
        </PageContainer>
      </footer>

      <CatalogCartHost
        store={store}
        purchaseInfo={purchaseInfo}
        exchangeRate={liveExchangeRate}
        showOfficialRate={showOfficialRate}
        showBsConversion={showBsConversion}
        showFab={false}
        panelView={cartPanelView}
        onPanelViewChange={setCartPanelView}
      />
    </div>
  );
}
