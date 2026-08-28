"use server";

import { getCatalogProducts } from "@/lib/catalog";
import { getPublicStoreBySlug } from "@/lib/stores";
import {
  CATALOG_PAGE_SIZE,
  parseCatalogPriceBound,
} from "@/lib/catalog/catalog-browse";
import type { CatalogListItem } from "@/lib/database.types";

export interface FetchPublicCatalogProductsInput {
  storeSlug: string;
  offset: number;
  limit?: number;
  categorySlug?: string | null;
  search?: string;
  minPrice?: string | number | null;
  maxPrice?: string | number | null;
  brand?: string | null;
}

export interface FetchPublicCatalogProductsResult {
  products: CatalogListItem[];
  totalCount: number;
  hasMore: boolean;
  error?: string;
}

/** Carga paginada del catálogo público (client-side “cargar más”). */
export async function fetchPublicCatalogProducts(
  input: FetchPublicCatalogProductsInput,
): Promise<FetchPublicCatalogProductsResult> {
  try {
    const limit = input.limit ?? CATALOG_PAGE_SIZE;
    const store = await getPublicStoreBySlug(input.storeSlug);
    const result = await getCatalogProducts({
      storeSlug: input.storeSlug,
      storeId: store?.id,
      limit,
      offset: input.offset,
      categorySlug: input.categorySlug?.trim() || undefined,
      search: input.search?.trim() || undefined,
      minPriceUsd: parseCatalogPriceBound(input.minPrice),
      maxPriceUsd: parseCatalogPriceBound(input.maxPrice),
      brand: input.brand?.trim() || undefined,
    });

    return {
      products: result.products,
      totalCount: result.totalCount,
      hasMore: result.hasMore,
    };
  } catch (error) {
    return {
      products: [],
      totalCount: 0,
      hasMore: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los productos.",
    };
  }
}

/** Obtiene un producto público por id o slug (deep-link `/producto/...`). */
export async function fetchPublicCatalogProductById(
  storeSlug: string,
  productId: string,
): Promise<{ product: CatalogListItem | null; error?: string }> {
  const id = productId.trim();
  if (!id) return { product: null };

  const looksLikeUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    );

  try {
    const result = await getCatalogProducts({
      storeSlug,
      ...(looksLikeUuid
        ? { productIds: [id] }
        : { productSlug: id.toLowerCase() }),
      limit: 1,
    });
    return { product: result.products[0] ?? null };
  } catch (error) {
    return {
      product: null,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo cargar el producto.",
    };
  }
}
