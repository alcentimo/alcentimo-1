import { getApexSiteHost, getSiteUrl } from "@/lib/site-url";
import {
  getStoreCatalogOrigin,
  isStoreSubdomainCatalogEnabled,
  parseStoreSlugFromHost,
} from "@/lib/store-host";

function isSafeRelativePath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

function isAllowedReturnHost(hostname: string, storeSlug?: string | null): boolean {
  const host = hostname.toLowerCase();
  const apexHost = getApexSiteHost();

  if (host === apexHost || host === `www.${apexHost}`) {
    return true;
  }

  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost")) {
    return true;
  }

  if (parseStoreSlugFromHost(host)) {
    return true;
  }

  if (storeSlug?.trim() && isStoreSubdomainCatalogEnabled()) {
    try {
      const expectedHost = new URL(getStoreCatalogOrigin(storeSlug.trim())).hostname;
      return host === expectedHost.toLowerCase();
    } catch {
      return false;
    }
  }

  return false;
}

/** Valida destinos post-auth para evitar open redirects. */
export function isSafeAuthReturnUrl(
  next: string | null | undefined,
  storeSlug?: string | null,
): boolean {
  if (!next?.trim()) return false;

  const trimmed = next.trim();
  if (isSafeRelativePath(trimmed)) {
    return true;
  }

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return false;
  }

  try {
    const url = new URL(trimmed);
    return isAllowedReturnHost(url.hostname, storeSlug);
  } catch {
    return false;
  }
}

export function sanitizeAuthReturnUrl(
  next: string | null | undefined,
  storeSlug?: string | null,
  fallback = "/dashboard",
): string {
  if (isSafeAuthReturnUrl(next, storeSlug)) {
    return next!.trim();
  }

  if (storeSlug?.trim() && isStoreSubdomainCatalogEnabled()) {
    return getStoreCatalogOrigin(storeSlug.trim());
  }

  const safeFallback = isSafeRelativePath(fallback) ? fallback : "/dashboard";
  return `${getSiteUrl()}${safeFallback}`;
}
