import type { Store } from "@/lib/database.types";
import type { StoreManifestTheme } from "@/lib/pwa/get-store-manifest-theme";
import {
  getDefaultCatalogOriginForSlug,
  resolveCatalogPwaContext,
} from "@/lib/pwa/resolve-catalog-pwa-context";
import type { StoreManifestIcon, WebAppManifest } from "@/lib/pwa/types";
import { getSiteUrl } from "@/lib/site-url";

export { getStoreCatalogManifestPath } from "@/lib/pwa/catalog-sw-paths";

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}

function absoluteAssetUrl(src: string, origin: string): string {
  if (/^https?:\/\//i.test(src)) return src;
  const base = normalizeOrigin(origin);
  return `${base}${src.startsWith("/") ? src : `/${src}`}`;
}

function buildManifestIcons(store: Store, origin: string): StoreManifestIcon[] {
  const base = normalizeOrigin(origin);
  const logoUrl = store.logo_url ? absoluteAssetUrl(store.logo_url, base) : null;

  const icon192 = store.pwa_icon_192_url
    ? absoluteAssetUrl(store.pwa_icon_192_url, base)
    : logoUrl ?? `${base}/icon-192x192.png`;

  const icon512 = store.pwa_icon_512_url
    ? absoluteAssetUrl(store.pwa_icon_512_url, base)
    : logoUrl ?? `${base}/icon-512x512.png`;

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

function buildShortName(storeName: string): string {
  const trimmed = storeName.trim();
  if (trimmed.length <= 12) return trimmed;
  const withoutSpaces = trimmed.slice(0, 12).trimEnd();
  return withoutSpaces.length >= 8 ? withoutSpaces : trimmed.slice(0, 12);
}

export function buildStoreWebManifest(
  store: Store,
  origin?: string,
  theme?: StoreManifestTheme,
): WebAppManifest {
  const manifestOrigin = normalizeOrigin(
    origin ?? getDefaultCatalogOriginForSlug(store.slug),
  );
  const pwa = resolveCatalogPwaContext(store.slug, manifestOrigin);
  const storeName = store.name.trim();

  return {
    id: pwa.id,
    name: storeName,
    short_name: buildShortName(storeName),
    description: `Catálogo y pedidos de ${storeName}`,
    start_url: pwa.startUrl,
    scope: pwa.scope,
    display: "standalone",
    display_override: ["standalone", "fullscreen"],
    orientation: "any",
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
  const manifestOrigin = normalizeOrigin(
    origin ?? getDefaultCatalogOriginForSlug(storeSlug),
  );
  const pwa = resolveCatalogPwaContext(storeSlug, manifestOrigin);

  return {
    id: pwa.id,
    name: "Catálogo",
    short_name: "Catálogo",
    description: "Catálogo de tienda",
    start_url: pwa.startUrl,
    scope: pwa.scope,
    display: "standalone",
    display_override: ["standalone", "fullscreen"],
    orientation: "any",
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
