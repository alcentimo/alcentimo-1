import type { Store } from "@/lib/database.types";
import { PWA_STORE_IDENTITY_VERSION } from "@/lib/pwa/constants";
import type { StoreManifestTheme } from "@/lib/pwa/get-store-manifest-theme";
import type { StoreManifestIcon, WebAppManifest } from "@/lib/pwa/types";
import { getSiteUrl } from "@/lib/site-url";

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}

/**
 * PWA del cliente final: scope estricto /c/{slug}/.
 * id y start_url únicos por tienda (Android no fusiona apps).
 */
export function buildStoreCatalogPwaPaths(storeSlug: string, origin?: string) {
  const slug = storeSlug.trim().toLowerCase();
  const base = normalizeOrigin(origin ?? getSiteUrl());
  const catalogPath = `/c/${slug}/`;

  return {
    id: `${base}${catalogPath}?pwa_id=store-${PWA_STORE_IDENTITY_VERSION}-${slug}`,
    scope: catalogPath,
    startUrl: catalogPath,
  };
}

function absoluteAssetUrl(src: string, origin: string): string {
  if (/^https?:\/\//i.test(src)) return src;
  const base = normalizeOrigin(origin);
  return `${base}${src.startsWith("/") ? src : `/${src}`}`;
}

function buildManifestIcons(store: Store, origin: string): StoreManifestIcon[] {
  const base = normalizeOrigin(origin);

  const icon192 = store.pwa_icon_192_url
    ? absoluteAssetUrl(store.pwa_icon_192_url, base)
    : `${base}/icon-192x192.png`;

  const icon512 = store.pwa_icon_512_url
    ? absoluteAssetUrl(store.pwa_icon_512_url, base)
    : store.logo_url
      ? absoluteAssetUrl(store.logo_url, base)
      : `${base}/icon-512x512.png`;

  return [
    {
      src: icon192,
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: icon512,
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: icon512,
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ];
}

export function buildStoreWebManifest(
  store: Store,
  origin?: string,
  theme?: StoreManifestTheme,
): WebAppManifest {
  const { id, scope, startUrl } = buildStoreCatalogPwaPaths(store.slug, origin);
  const manifestOrigin = normalizeOrigin(origin ?? getSiteUrl());
  const storeName = store.name.trim();

  return {
    id,
    name: storeName,
    short_name: storeName.slice(0, 12),
    description: `Catálogo y pedidos de ${storeName}`,
    start_url: startUrl,
    scope,
    display: "standalone",
    display_override: ["standalone", "fullscreen"],
    orientation: "portrait-primary",
    background_color: theme?.background_color ?? "#ffffff",
    theme_color: theme?.theme_color ?? "#0d9488",
    lang: "es",
    icons: buildManifestIcons(store, manifestOrigin),
  };
}

export function buildFallbackStoreWebManifest(
  storeSlug: string,
  origin?: string,
): WebAppManifest {
  const { id, scope, startUrl } = buildStoreCatalogPwaPaths(storeSlug, origin);
  const manifestOrigin = normalizeOrigin(origin ?? getSiteUrl());

  return {
    id,
    name: "Catálogo",
    short_name: "Catálogo",
    description: "Catálogo de tienda",
    start_url: startUrl,
    scope,
    display: "standalone",
    display_override: ["standalone", "fullscreen"],
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#0d9488",
    lang: "es",
    icons: [
      {
        src: `${manifestOrigin}/icon-192x192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${manifestOrigin}/icon-512x512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${manifestOrigin}/icon-512x512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

/** Manifiesto exclusivo del catálogo cliente (no compartir con /manifest.json admin). */
export function getStoreCatalogManifestPath(storeSlug: string): string {
  return `/c/${storeSlug.trim().toLowerCase()}/manifest.json`;
}
