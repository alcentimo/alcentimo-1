"use client";

import { useMemo } from "react";
import type { CatalogListItem, ExchangeRate, Store } from "@/lib/database.types";
import type { CatalogPreviewSettings } from "@/lib/catalog/get-public-catalog-page-data";
import { CartProvider } from "@/components/catalog-transactional/CartProvider";
import { PromotionProvider } from "@/components/catalog-transactional/PromotionProvider";
import { TransactionalCatalog } from "@/components/catalog-transactional/TransactionalCatalog";
import { CatalogTabBar } from "@/components/catalog-transactional/CatalogTabBar";
import { CatalogChatWidget } from "@/components/catalog-transactional/CatalogChatWidget";
import { CatalogWhatsAppQuickChat } from "@/components/catalog-transactional/CatalogWhatsAppQuickChat";
import { CatalogShellNavigationProvider } from "@/components/catalog-transactional/CatalogShellNavigation";
import { CatalogPreviewPortalProvider } from "@/components/dashboard/CatalogPreviewPortalContext";
import { CustomerAccountModeProvider } from "@/components/catalog-transactional/CustomerAccountModeContext";
import {
  getCatalogDesignClasses,
  getCatalogRubroClass,
  getCatalogThemeStyle,
} from "@/lib/store-settings/catalog-theme";
import { storeHasPCBuilderFromStore } from "@/lib/rubros/modules/tecnologia/pc-builder";
import { CatalogStoreBrandingProvider } from "@/components/catalog/CatalogStoreBrandingContext";
import { cn } from "@/lib/cn";

interface CatalogLivePreviewProps {
  store: Store;
  products: CatalogListItem[];
  exchangeRate: number | null;
  exchangeRateUpdatedAt?: string | null;
  settings: CatalogPreviewSettings;
  referenceMode?: boolean;
  showReferenceCta?: boolean;
  /**
   * Sandbox interactivo (landing): carrito, Ayuda y WhatsApp reales
   * contenidos en el marco de vista previa.
   */
  interactive?: boolean;
  whatsappPhone?: string | null;
  whatsappChatWelcome?: string | null;
  assistantEnabled?: boolean;
  assistantDemoMode?: boolean;
}

function toPreviewExchangeRate(
  rate: number | null,
  updatedAt?: string | null,
): ExchangeRate | null {
  if (rate == null) return null;

  const timestamp = updatedAt ?? new Date().toISOString();

  return {
    id: "preview-rate",
    rate,
    source: "bcv",
    effective_date: timestamp.slice(0, 10),
    notes: null,
    store_id: null,
    created_at: timestamp,
  };
}

export function CatalogLivePreview({
  store,
  products,
  exchangeRate,
  exchangeRateUpdatedAt = null,
  settings,
  referenceMode = false,
  showReferenceCta = false,
  interactive = false,
  whatsappPhone = null,
  whatsappChatWelcome = null,
  assistantEnabled = false,
  assistantDemoMode = false,
}: CatalogLivePreviewProps) {
  const exchangeRateRow = useMemo(
    () => toPreviewExchangeRate(exchangeRate, exchangeRateUpdatedAt),
    [exchangeRate, exchangeRateUpdatedAt],
  );

  const themeStyle = useMemo(
    () => getCatalogThemeStyle(settings.catalogDesign, store.rubro_tienda),
    [settings.catalogDesign, store.rubro_tienda],
  );

  const themeClasses = useMemo(
    () => getCatalogDesignClasses(settings.catalogDesign, store.rubro_tienda),
    [settings.catalogDesign, store.rubro_tienda],
  );

  const phone =
    whatsappPhone?.trim() ||
    settings.purchaseInfo.whatsappPhone?.trim() ||
    "";

  const content = (
    <PromotionProvider value={{ guestBanner: null, autoApply: null }}>
      <CartProvider
        storeSlug={store.slug}
        storeId={store.id}
        userId={null}
        isCustomer={false}
        wholesaleEnabled={settings.catalogCurrency.wholesaleEnabled}
      >
        <CatalogPreviewPortalProvider
          className={cn(
            "catalog-live-preview-root txn-catalog-root",
            interactive && "catalog-live-preview-root--interactive",
            getCatalogRubroClass(store.rubro_tienda),
            themeClasses,
          )}
          style={themeStyle}
        >
          <CatalogStoreBrandingProvider
            logoUrl={
              store.pwa_icon_192_url ??
              store.pwa_icon_512_url ??
              store.logo_url ??
              null
            }
            storeName={store.name}
          >
            <div className="catalog-live-preview-scroll">
              <TransactionalCatalog
                store={store}
                products={products}
                exchangeRate={exchangeRateRow}
                purchaseInfo={settings.purchaseInfo}
                catalogDesign={settings.catalogDesign}
                catalogCurrency={settings.catalogCurrency}
                previewMode
                enableCart={interactive}
                referenceMode={referenceMode}
                showReferenceCta={showReferenceCta}
              />
            </div>
            {interactive && assistantEnabled ? (
              <CatalogChatWidget
                storeSlug={store.slug}
                storeName={store.name}
                merchantName={store.name}
                whatsappPhone={phone || null}
                demoMode={assistantDemoMode}
              />
            ) : null}
            {interactive && phone ? (
              <CatalogWhatsAppQuickChat
                storeName={store.name}
                whatsappPhone={phone}
                welcomeMessage={
                  whatsappChatWelcome ??
                  settings.purchaseInfo.whatsappChatWelcome
                }
              />
            ) : null}
            {interactive ? (
              <div
                className="catalog-live-preview-tab-bar catalog-live-preview-tab-bar--interactive"
              >
                <CatalogTabBar
                  storeSlug={store.slug}
                  pcBuilderEnabled={storeHasPCBuilderFromStore(store)}
                />
              </div>
            ) : null}
          </CatalogStoreBrandingProvider>
        </CatalogPreviewPortalProvider>
      </CartProvider>
    </PromotionProvider>
  );

  if (!interactive) {
    return content;
  }

  return (
    <CustomerAccountModeProvider accountMode="hibrido">
      <CatalogShellNavigationProvider storeSlug={store.slug}>
        {content}
      </CatalogShellNavigationProvider>
    </CustomerAccountModeProvider>
  );
}
