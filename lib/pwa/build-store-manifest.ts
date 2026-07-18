import type { Store } from "@/lib/database.types";
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
    id: `${base}${catalogPath}`,
    scope: catalogPath,
    startUrl: catalogPath,
  };
}

export function buildStoreWebManifest(
  store: Store,
  origin?: string,
): StoreWebManifest {
  const { id, scope, startUrl } = buildStoreCatalogPwaPaths(store.slug, origin);

  const icons: StoreManifestIcon[] = [];

  if (store.pwa_icon_192_url) {
    icons.push({
      src: store.pwa_icon_192_url,
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    });
  }

  if (store.pwa_icon_512_url) {
    icons.push(
      {
        src: store.pwa_icon_512_url,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: store.pwa_icon_512_url,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    );
  }

  if (icons.length === 0 && store.logo_url) {
    icons.push({
      src: store.logo_url,
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    });
  }

  return {
    id,
    name: store.name,
    short_name: store.name.slice(0, 12),
    description: `Catálogo y pedidos de ${store.name}`,
    start_url: startUrl,
    scope,
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#0d9488",
    lang: "es",
    icons,
  };
}

export function getStoreManifestPath(storeSlug: string): string {
  return `/c/${storeSlug.trim().toLowerCase()}/manifest.json`;
}
