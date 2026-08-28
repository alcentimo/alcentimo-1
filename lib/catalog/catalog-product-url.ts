import {
  getStoreCatalogBasePath,
  getStoreProductDeepLinkPath,
  parsePublicCatalogProductPath,
} from "@/lib/store-host";

export const CATALOG_PRODUCT_HISTORY_KEY = "alcentimoCatalogProduct";

export interface CatalogProductHistoryState {
  [CATALOG_PRODUCT_HISTORY_KEY]?: {
    productId: string;
    productSlug: string;
  } | null;
}

function stripProductQuery(search: string): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  params.delete("product");
  const next = params.toString();
  return next ? `?${next}` : "";
}

export function readCatalogProductKeyFromLocation(
  pathname: string,
  search = "",
): string | null {
  const fromPath = parsePublicCatalogProductPath(pathname)?.productKey ?? null;
  if (fromPath) return fromPath;
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const fromQuery = params.get("product")?.trim();
  return fromQuery || null;
}

export function buildCatalogProductLocation(
  storeSlug: string,
  productSlug: string,
  pathname: string,
  search = "",
  hash = "",
): string {
  const path = getStoreProductDeepLinkPath(storeSlug, productSlug, { pathname });
  return `${path}${stripProductQuery(search)}${hash}`;
}

export function buildCatalogListingLocation(
  storeSlug: string,
  pathname: string,
  search = "",
  hash = "",
): string {
  const parsed = parsePublicCatalogProductPath(pathname);
  const path = parsed
    ? getStoreCatalogBasePath(storeSlug, { pathname })
    : pathname || "/";
  return `${path}${stripProductQuery(search)}${hash}`;
}

export function productKeyMatches(
  product: { product_id: string; product_slug: string },
  key: string | null,
): boolean {
  if (!key) return false;
  const normalized = decodeURIComponent(key).trim().toLowerCase();
  return (
    product.product_id.toLowerCase() === normalized ||
    product.product_slug.toLowerCase() === normalized
  );
}
