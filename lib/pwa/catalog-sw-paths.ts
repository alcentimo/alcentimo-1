export function getCatalogServiceWorkerUrl(storeSlug: string): string {
  return `/c/${storeSlug.trim().toLowerCase()}/sw.js`;
}

export function getCatalogServiceWorkerScope(storeSlug: string): string {
  return `/c/${storeSlug.trim().toLowerCase()}/`;
}

export function getStoreCatalogManifestPath(storeSlug: string): string {
  return `/c/${storeSlug.trim().toLowerCase()}/manifest.json`;
}

export function getStoreCatalogManifestAbsoluteUrl(
  storeSlug: string,
  origin: string,
): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${getStoreCatalogManifestPath(storeSlug)}`;
}

export function getCatalogServiceWorkerAbsoluteUrl(
  storeSlug: string,
  origin: string,
): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${getCatalogServiceWorkerUrl(storeSlug)}`;
}

export function getCatalogCanonicalUrl(storeSlug: string, origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/c/${storeSlug.trim().toLowerCase()}/`;
}
