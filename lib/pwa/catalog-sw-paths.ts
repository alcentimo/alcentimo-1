import { resolveCatalogPwaContext } from "@/lib/pwa/resolve-catalog-pwa-context";
import { getDefaultCatalogOriginForSlug } from "@/lib/pwa/resolve-catalog-pwa-context";

export function getCatalogServiceWorkerUrl(storeSlug: string, origin?: string): string {
  const resolvedOrigin = origin ?? getDefaultCatalogOriginForSlug(storeSlug);
  return resolveCatalogPwaContext(storeSlug, resolvedOrigin).serviceWorkerPath;
}

export function getCatalogServiceWorkerScope(storeSlug: string, origin?: string): string {
  const resolvedOrigin = origin ?? getDefaultCatalogOriginForSlug(storeSlug);
  return resolveCatalogPwaContext(storeSlug, resolvedOrigin).serviceWorkerScope;
}

export function getStoreCatalogManifestPath(storeSlug: string, origin?: string): string {
  const resolvedOrigin = origin ?? getDefaultCatalogOriginForSlug(storeSlug);
  return resolveCatalogPwaContext(storeSlug, resolvedOrigin).manifestPath;
}

export function getStoreCatalogManifestAbsoluteUrl(
  storeSlug: string,
  origin: string,
): string {
  return resolveCatalogPwaContext(storeSlug, origin).manifestAbsoluteUrl;
}

export function getCatalogServiceWorkerAbsoluteUrl(
  storeSlug: string,
  origin: string,
): string {
  const base = origin.replace(/\/$/, "");
  const path = resolveCatalogPwaContext(storeSlug, origin).serviceWorkerPath;
  return `${base}${path}`;
}

export function getCatalogCanonicalUrl(storeSlug: string, origin: string): string {
  return resolveCatalogPwaContext(storeSlug, origin).canonicalUrl;
}
