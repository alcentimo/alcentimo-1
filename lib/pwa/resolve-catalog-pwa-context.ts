import {
  isSubdomainCatalogOrigin,
  getStoreCatalogOrigin,
} from "@/lib/store-host";
import { PWA_STORE_IDENTITY_VERSION } from "@/lib/pwa/constants";

export interface CatalogPwaContext {
  mode: "subdomain" | "path";
  origin: string;
  storeSlug: string;
  id: string;
  scope: string;
  startUrl: string;
  manifestPath: string;
  manifestAbsoluteUrl: string;
  serviceWorkerPath: string;
  serviceWorkerScope: string;
  canonicalUrl: string;
}

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}

/** Contexto PWA según host: subdominio (/) vs path legacy (/c/slug/). */
export function resolveCatalogPwaContext(
  storeSlug: string,
  origin: string,
): CatalogPwaContext {
  const slug = storeSlug.trim().toLowerCase();
  const base = normalizeOrigin(origin);
  const subdomain = isSubdomainCatalogOrigin(origin, slug);

  if (subdomain) {
    return {
      mode: "subdomain",
      origin: base,
      storeSlug: slug,
      id: `${base}/?pwa_id=store-${PWA_STORE_IDENTITY_VERSION}-${slug}`,
      scope: "/",
      startUrl: "/",
      manifestPath: "/manifest.json",
      manifestAbsoluteUrl: `${base}/manifest.json`,
      serviceWorkerPath: "/sw.js",
      serviceWorkerScope: "/",
      canonicalUrl: `${base}/`,
    };
  }

  const catalogPath = `/c/${slug}/`;

  return {
    mode: "path",
    origin: base,
    storeSlug: slug,
    id: `${base}${catalogPath}?pwa_id=store-${PWA_STORE_IDENTITY_VERSION}-${slug}`,
    scope: catalogPath,
    startUrl: catalogPath,
    manifestPath: `/c/${slug}/manifest.json`,
    manifestAbsoluteUrl: `${base}/c/${slug}/manifest.json`,
    serviceWorkerPath: `/c/${slug}/sw.js`,
    serviceWorkerScope: catalogPath,
    canonicalUrl: `${base}/c/${slug}/`,
  };
}

/** Origen por defecto para builders server-side sin request origin. */
export function getDefaultCatalogOriginForSlug(storeSlug: string): string {
  if (process.env.NODE_ENV === "production") {
    return getStoreCatalogOrigin(storeSlug);
  }

  return normalizeOrigin(
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://alcentimo.com",
  );
}
