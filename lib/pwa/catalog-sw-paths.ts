export function getCatalogServiceWorkerUrl(storeSlug: string): string {
  return `/c/${storeSlug.trim().toLowerCase()}/sw.js`;
}

export function getCatalogServiceWorkerScope(storeSlug: string): string {
  return `/c/${storeSlug.trim().toLowerCase()}/`;
}

export function getCatalogCanonicalUrl(storeSlug: string, origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/c/${storeSlug.trim().toLowerCase()}/`;
}
