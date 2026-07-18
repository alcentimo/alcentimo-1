import type { Store } from "@/lib/database.types";
import { PWA_IDENTITY_VERSION } from "@/lib/pwa/constants";
import { getSiteUrl } from "@/lib/site-url";

export interface StoreManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose: string;
}

export interface StoreWebManifest {
  id: string;
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  scope: string;
  display: string;
  display_override?: string[];
  orientation: string;
  background_color: string;
  theme_color: string;
  lang: string;
  icons: StoreManifestIcon[];
}

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}

/**
 * Rutas PWA del catálogo.
 * - start_url/scope en path relativo (resuelto contra el origen del manifest): mejor compatibilidad móvil.
 * - scope cubre /c/{slug}/, /c/{slug}/cuenta, /c/{slug}/perfil, etc.
 */
export function buildStoreCatalogPwaPaths(storeSlug: string, origin?: string) {
  const slug = storeSlug.trim().toLowerCase();
  const base = normalizeOrigin(origin ?? getSiteUrl());
  const catalogPath = `/c/${slug}/`;

  return {
    id: `${base}${catalogPath}?pwa_id=${PWA_IDENTITY_VERSION}`,
    scope: catalogPath,
    startUrl: catalogPath,
  };
}

/** Nombre visible distinto para que el móvil no fusione con instalaciones anteriores. */
export function formatPwaManifestName(storeName: string): string {
  return `${storeName.trim()} · App`;
}

export function formatPwaManifestShortName(storeName: string): string {
  const base = storeName.trim();
  const withSuffix = `${base} ·`;
  if (withSuffix.length <= 12) return withSuffix;
  return `${base.slice(0, 10).trimEnd()} ·`;
}

function absoluteAssetUrl(src: string, origin: string): string {
  if (/^https?:\/\//i.test(src)) return src;
  const base = normalizeOrigin(origin);
  return `${base}${src.startsWith("/") ? src : `/${src}`}`;
}

function buildManifestIcons(store: Store, origin: string): StoreManifestIcon[] {
  const icons: StoreManifestIcon[] = [];
  const base = normalizeOrigin(origin);

  const icon192 = store.pwa_icon_192_url
    ? absoluteAssetUrl(store.pwa_icon_192_url, base)
    : `${base}/icon-192x192.png`;

  const icon512 = store.pwa_icon_512_url
    ? absoluteAssetUrl(store.pwa_icon_512_url, base)
    : store.logo_url
      ? absoluteAssetUrl(store.logo_url, base)
      : `${base}/icon-512x512.png`;

  icons.push({
    src: icon192,
    sizes: "192x192",
    type: "image/png",
    purpose: "any",
  });

  icons.push(
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
  );

  return icons;
}

export function buildStoreWebManifest(
  store: Store,
  origin?: string,
): StoreWebManifest {
  const { id, scope, startUrl } = buildStoreCatalogPwaPaths(store.slug, origin);
  const manifestOrigin = normalizeOrigin(origin ?? getSiteUrl());

  return {
    id,
    name: formatPwaManifestName(store.name),
    short_name: formatPwaManifestShortName(store.name),
    description: `Catálogo y pedidos de ${store.name}`,
    start_url: startUrl,
    scope,
    display: "standalone",
    display_override: ["standalone", "fullscreen"],
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#0d9488",
    lang: "es",
    icons: buildManifestIcons(store, manifestOrigin),
  };
}

export function buildFallbackStoreWebManifest(
  storeSlug: string,
  origin?: string,
): StoreWebManifest {
  const { id, scope, startUrl } = buildStoreCatalogPwaPaths(storeSlug, origin);
  const manifestOrigin = normalizeOrigin(origin ?? getSiteUrl());

  return {
    id,
    name: formatPwaManifestName("Catálogo"),
    short_name: formatPwaManifestShortName("Catálogo"),
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

export function getStoreManifestPath(storeSlug: string): string {
  const slug = storeSlug.trim().toLowerCase();
  return `/manifest.json?store=${encodeURIComponent(slug)}`;
}

export function getStoreCatalogManifestPath(storeSlug: string): string {
  return `/c/${storeSlug.trim().toLowerCase()}/manifest.json`;
}
