import type { Metadata } from "next";
import type { ReactNode } from "react";
import { use } from "react";
import { PublicCatalogLayoutClient } from "@/components/catalog-transactional/PublicCatalogLayoutClient";
import {
  getCatalogCanonicalUrl,
  getStoreCatalogManifestAbsoluteUrl,
} from "@/lib/pwa/catalog-sw-paths";
import { getRequestOrigin } from "@/lib/pwa/get-request-origin";
import { getStoreManifestTheme } from "@/lib/pwa/get-store-manifest-theme";
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

  return {
    metadataBase: new URL(origin),
    title: `${storeName} — Pedidos`,
    description: `Catálogo y pedidos de ${storeName}`,
    alternates: {
      canonical: canonicalUrl,
    },
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

/**
 * Layout síncrono (sin awaits de carrito/tema/settings).
 * El chrome se hidrata en PublicCatalogLayoutClient.
 */
export default function TransactionalCatalogLayout({
  children,
  params,
}: TransactionalCatalogLayoutProps) {
  const { store_slug: storeSlug } = use(params);

  return (
    <PublicCatalogLayoutClient storeSlug={storeSlug}>
      {children}
    </PublicCatalogLayoutClient>
  );
}
