import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CartProvider } from "@/components/catalog-transactional/CartProvider";
import { CatalogAppShell } from "@/components/catalog-transactional/CatalogAppShell";
import { PromotionProvider } from "@/components/catalog-transactional/PromotionProvider";
import { getCartAuthContext } from "@/lib/customers/get-cart-auth-context";
import { getCatalogPromotionContext } from "@/lib/promotions/get-catalog-promotion";
import { recordCatalogVisit } from "@/lib/analytics/track-catalog-visit";
import { CatalogPwaHeadLinks } from "@/components/catalog-transactional/CatalogPwaHeadLinks";
import {
  getCatalogCanonicalUrl,
  getStoreCatalogManifestAbsoluteUrl,
} from "@/lib/pwa/catalog-sw-paths";
import { getRequestOrigin } from "@/lib/pwa/get-request-origin";
import { getPublicStoreBySlug } from "@/lib/stores";

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
  const manifestAbsoluteUrl = getStoreCatalogManifestAbsoluteUrl(store.slug, origin);
  const canonicalUrl = getCatalogCanonicalUrl(store.slug, origin);
  const storeName = store.name.trim();
  const icons: Metadata["icons"] = [];

  if (store.pwa_icon_192_url) {
    icons.push({
      url: store.pwa_icon_192_url,
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

  return {
    metadataBase: new URL(origin),
    title: `${storeName} — Pedidos`,
    description: `Catálogo y pedidos de ${storeName}`,
    alternates: {
      canonical: canonicalUrl,
    },
    manifest: manifestAbsoluteUrl,
    applicationName: storeName,
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
  const store = await getPublicStoreBySlug(storeSlug);
  const promotionContext = await getCatalogPromotionContext(
    storeSlug,
    cartAuth.isCustomer,
  );

  if (cartAuth.storeId) {
    void recordCatalogVisit(storeSlug, cartAuth.storeId, cartAuth.userId);
  }

  const storeLogoUrl =
    store?.pwa_icon_192_url ?? store?.pwa_icon_512_url ?? store?.logo_url ?? null;
  const origin = await getRequestOrigin();
  const manifestAbsoluteUrl = getStoreCatalogManifestAbsoluteUrl(storeSlug, origin);

  return (
    <div className="txn-catalog-root">
      <CatalogPwaHeadLinks
        manifestAbsoluteUrl={manifestAbsoluteUrl}
        storeSlug={storeSlug}
      />
      <CartProvider
        storeSlug={storeSlug}
        storeId={cartAuth.storeId}
        userId={cartAuth.userId}
        isCustomer={cartAuth.isCustomer}
      >
        <PromotionProvider value={promotionContext}>
          <CatalogAppShell
            storeSlug={storeSlug}
            storeName={store?.name ?? ""}
            storeLogoUrl={storeLogoUrl}
          >
            {children}
          </CatalogAppShell>
        </PromotionProvider>
      </CartProvider>
    </div>
  );
}
