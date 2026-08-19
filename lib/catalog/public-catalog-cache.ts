import { revalidateTag, unstable_cache } from "next/cache";

/**
 * Data Cache del catálogo público (vitrinas dropship).
 *
 * Las rutas `/c/[store_slug]` siguen dinámicas (sesión, carrito, visitas),
 * pero las lecturas a Supabase viven en el Data Cache de Next.js con
 * revalidación ISR-style: 60s + invalidación por tag al mutar el catálogo.
 */
export const PUBLIC_CATALOG_CACHE_TAG = "public-catalog";

/** Intervalo de revalidación (stale-while-revalidate) en segundos. */
export const PUBLIC_CATALOG_REVALIDATE_SECONDS = 60;

export function publicCatalogStoreTag(storeSlug: string): string {
  return `${PUBLIC_CATALOG_CACHE_TAG}:${storeSlug.trim().toLowerCase()}`;
}

export function publicCatalogStoreIdTag(storeId: string): string {
  return `${PUBLIC_CATALOG_CACHE_TAG}:id:${storeId.trim()}`;
}

export function publicCatalogCacheConfig(input: {
  slug?: string | null;
  storeId?: string | null;
}): { revalidate: number; tags: string[] } {
  const tags = [PUBLIC_CATALOG_CACHE_TAG];
  const slug = input.slug?.trim().toLowerCase() ?? "";
  const storeId = input.storeId?.trim() ?? "";
  if (slug) tags.push(publicCatalogStoreTag(slug));
  if (storeId) tags.push(publicCatalogStoreIdTag(storeId));
  return {
    revalidate: PUBLIC_CATALOG_REVALIDATE_SECONDS,
    tags,
  };
}

/** Envuelve una lectura pública en el Data Cache, etiquetada por tienda. */
export function withPublicCatalogCache<T>(
  keyParts: string[],
  tags: { slug?: string | null; storeId?: string | null },
  fn: () => Promise<T>,
): Promise<T> {
  const config = publicCatalogCacheConfig(tags);
  return unstable_cache(fn, keyParts, config)();
}

/** Invalida el Data Cache de una vitrina (on-demand, besides the 60s TTL). */
export function revalidatePublicCatalogCache(input: {
  slug?: string | null;
  storeId?: string | null;
}): void {
  const slug = input.slug?.trim().toLowerCase() ?? "";
  const storeId = input.storeId?.trim() ?? "";
  if (slug) {
    revalidateTag(publicCatalogStoreTag(slug), "max");
  }
  if (storeId) {
    revalidateTag(publicCatalogStoreIdTag(storeId), "max");
  }
}

/** Invalida todas las vitrinas (precio BCV, stock mayorista, galería). */
export function revalidateAllPublicCatalogCaches(): void {
  revalidateTag(PUBLIC_CATALOG_CACHE_TAG, "max");
}
