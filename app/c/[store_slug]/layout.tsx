import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CartProvider } from "@/components/catalog-transactional/CartProvider";
import { CatalogAppShell } from "@/components/catalog-transactional/CatalogAppShell";
import { CustomerSessionProvider } from "@/components/catalog-transactional/CustomerSessionProvider";
import { PromotionProvider } from "@/components/catalog-transactional/PromotionProvider";
import { getCartAuthContext } from "@/lib/customers/get-cart-auth-context";
import { getCustomerCheckoutContext } from "@/lib/customers/get-customer-checkout-context";
import { getCatalogPromotionContext } from "@/lib/promotions/get-catalog-promotion";
import { recordCatalogVisit } from "@/lib/analytics/track-catalog-visit";
import { CatalogPwaHeadLinks } from "@/components/catalog-transactional/CatalogPwaHeadLinks";
import { getPublicCatalogThemeContext } from "@/lib/catalog/get-public-catalog-theme";
import { cn } from "@/lib/cn";
import {
  getCatalogCanonicalUrl,
  getStoreCatalogManifestAbsoluteUrl,
} from "@/lib/pwa/catalog-sw-paths";
import { getRequestOrigin } from "@/lib/pwa/get-request-origin";
import { getStoreManifestTheme } from "@/lib/pwa/get-store-manifest-theme";
import { getPublicStoreBySlug } from "@/lib/stores";
import { getOpenAiApiKey } from "@/lib/env/server";
import { getPublicStoreSettingsConfig } from "@/lib/store-settings/get-public-store-settings";
import { getStorefrontSupportBranding } from "@/lib/catalog/get-storefront-support-branding";
import { resolveStorefrontAssistantAvatar } from "@/lib/catalog/resolve-storefront-assistant-avatar";
import { resolveCatalogAccess } from "@/lib/catalog-access/resolve";
import {
  CATALOG_ACCESS_MODE_LABELS,
  isRestrictedCatalogAccessMode,
  normalizeCatalogAccessSettings,
} from "@/lib/catalog-access/types";
import { CatalogAccessGate } from "@/components/catalog-transactional/CatalogAccessGate";
import { CatalogAccessPreviewBanner } from "@/components/catalog-transactional/CatalogAccessPreviewBanner";
import { notFound } from "next/navigation";

interface TransactionalCatalogLayoutProps {
  children: ReactNode;
  params: Promise<{ store_slug: string }>;
}

export async function generateMetadata({
  params,
}: TransactionalCatalogLayoutProps): Promise<Metadata> {
  const { store_slug: storeSlug } = await params;
  const store = await getPublicStoreBySlug(storeSlug);

  if (!store) {
    return { title: "Catálogo no encontrado" };
  }

  const origin = await getRequestOrigin();
  const manifestAbsoluteUrl = getStoreCatalogManifestAbsoluteUrl(
    store.slug,
    origin,
  );
  const canonicalUrl = getCatalogCanonicalUrl(store.slug, origin);
  const storeName = store.name.trim();
  const theme = await getStoreManifestTheme(store);
  const icons: Metadata["icons"] = [];

  if (store.pwa_icon_192_url) {
    icons.push({
      url: store.pwa_icon_192_url,
      sizes: "192x192",
      type: "image/png",
    });
  } else if (store.logo_url) {
    icons.push({
      url: store.logo_url,
      sizes: "192x192",
      type: "image/png",
    });
  }

  if (store.pwa_icon_512_url) {
    icons.push({
      url: store.pwa_icon_512_url,
      sizes: "512x512",
      type: "image/png",
    });
  } else if (store.logo_url) {
    icons.push({
      url: store.logo_url,
      sizes: "512x512",
      type: "image/png",
    });
  }

  const settings = await getPublicStoreSettingsConfig(store.id);
  const accessMode = normalizeCatalogAccessSettings(settings.catalogAccess).mode;
  const restricted = isRestrictedCatalogAccessMode(accessMode);

  return {
    metadataBase: new URL(origin),
    title: `${storeName} — Pedidos`,
    description: `Catálogo y pedidos de ${storeName}`,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: restricted
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : undefined,
    manifest: manifestAbsoluteUrl,
    applicationName: storeName,
    themeColor: theme.theme_color,
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: storeName.slice(0, 12),
    },
    icons: icons.length > 0 ? icons : undefined,
  };
}

export default async function TransactionalCatalogLayout({
  children,
  params,
}: TransactionalCatalogLayoutProps) {
  const { store_slug: storeSlug } = await params;
  const cartAuth = await getCartAuthContext(storeSlug);
  const customerSession = await getCustomerCheckoutContext(storeSlug);
  const store = await getPublicStoreBySlug(storeSlug);
  const promotionContext = await getCatalogPromotionContext(
    storeSlug,
    customerSession.isCustomer,
  );

  if (!store) {
    notFound();
  }

  const access = await resolveCatalogAccess({
    storeId: store.id,
    storeName: store.name,
  });

  if (access.status === "unavailable") {
    notFound();
  }

  if (cartAuth.storeId) {
    void recordCatalogVisit(storeSlug, cartAuth.storeId, cartAuth.userId);
  }

  // Preferir logo_url para UI (puede ser GIF animado). Los iconos PWA quedan para el manifest.
  const storeLogoUrl =
    store.logo_url ?? store.pwa_icon_192_url ?? store.pwa_icon_512_url ?? null;
  const origin = await getRequestOrigin();
  const manifestAbsoluteUrl = getStoreCatalogManifestAbsoluteUrl(
    storeSlug,
    origin,
  );
  const themeContext = await getPublicCatalogThemeContext(storeSlug);
  const assistantEnabled = Boolean(getOpenAiApiKey());
  const storeSettings = await getPublicStoreSettingsConfig(store.id);
  const wholesaleEnabled =
    storeSettings.catalogCurrency.wholesaleEnabled ?? false;
  const whatsappPhone = storeSettings.contact.whatsappPhone?.trim() || null;
  const whatsappChatWelcome =
    storeSettings.contact.whatsappChatWelcome?.trim() || null;
  const supportBranding = await getStorefrontSupportBranding(store);
  const storeLogoFallback = supportBranding?.avatarUrl ?? storeLogoUrl;
  const assistantAvatar = resolveStorefrontAssistantAvatar(
    storeSettings.catalogDesign.assistantAvatar,
    storeLogoFallback,
  );

  const lockedContent =
    access.status === "locked" ? (
      <CatalogAccessGate
        storeSlug={storeSlug}
        storeName={access.storeName}
        reason={access.reason}
      />
    ) : (
      children
    );

  return (
    <div
      className={cn(
        "txn-catalog-root",
        themeContext?.rubroClass,
        themeContext?.designClasses,
      )}
      style={themeContext?.style}
    >
      <CatalogPwaHeadLinks
        manifestAbsoluteUrl={manifestAbsoluteUrl}
        storeSlug={storeSlug}
      />
      {access.status === "open" && access.preview ? (
        <CatalogAccessPreviewBanner
          modeLabel={CATALOG_ACCESS_MODE_LABELS[access.mode]}
        />
      ) : null}
      <CartProvider
        storeSlug={storeSlug}
        storeId={cartAuth.storeId}
        userId={cartAuth.userId}
        isCustomer={cartAuth.isCustomer}
        wholesaleEnabled={wholesaleEnabled}
      >
        <PromotionProvider value={promotionContext}>
          <CustomerSessionProvider
            storeSlug={storeSlug}
            initial={{
              isCustomer: customerSession.isCustomer,
              userId: customerSession.userId,
              displayName: customerSession.displayName,
              phone: customerSession.phone,
              contactEmail: customerSession.contactEmail,
            }}
          >
            <CatalogAppShell
              storeSlug={storeSlug}
              storeName={store.name ?? ""}
              storeLogoUrl={storeLogoUrl}
              storeDescription={store.description ?? null}
              locationHours={storeSettings.locationHours ?? null}
              storeRubro={store.rubro_tienda}
              enablePcBuilder={store.enable_pc_builder}
              assistantEnabled={assistantEnabled && access.status === "open"}
              whatsappPhone={whatsappPhone}
              whatsappChatWelcome={whatsappChatWelcome}
              supportAvatarUrl={assistantAvatar.url}
              supportAvatarAnimation={assistantAvatar.animation}
              supportAvatarAnimated={assistantAvatar.animated}
              supportMerchantName={supportBranding?.merchantName ?? null}
              customerAccountMode="hibrido"
            >
              {lockedContent}
            </CatalogAppShell>
          </CustomerSessionProvider>
        </PromotionProvider>
      </CartProvider>
    </div>
  );
}
