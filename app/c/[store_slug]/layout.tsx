import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CartProvider } from "@/components/catalog-transactional/CartProvider";
import { CatalogAppShell } from "@/components/catalog-transactional/CatalogAppShell";
import { PromotionProvider } from "@/components/catalog-transactional/PromotionProvider";
import { getCartAuthContext } from "@/lib/customers/get-cart-auth-context";
import { getCatalogPromotionContext } from "@/lib/promotions/get-catalog-promotion";
import { recordCatalogVisit } from "@/lib/analytics/track-catalog-visit";
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

  const manifestPath = `/c/${store.slug}/manifest.webmanifest`;
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
    title: `${store.name} — Pedidos`,
    description: `Catálogo y pedidos de ${store.name}`,
    manifest: manifestPath,
    applicationName: store.name,
    appleWebApp: {
      capable: true,
      title: store.name,
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
  const promotionContext = await getCatalogPromotionContext(
    storeSlug,
    cartAuth.isCustomer,
  );

  if (cartAuth.storeId) {
    void recordCatalogVisit(storeSlug, cartAuth.storeId, cartAuth.userId);
  }

  return (
    <div className="txn-catalog-root">
      <CartProvider
        storeSlug={storeSlug}
        storeId={cartAuth.storeId}
        userId={cartAuth.userId}
        isCustomer={cartAuth.isCustomer}
      >
        <PromotionProvider value={promotionContext}>
          <CatalogAppShell storeSlug={storeSlug}>{children}</CatalogAppShell>
        </PromotionProvider>
      </CartProvider>
    </div>
  );
}
