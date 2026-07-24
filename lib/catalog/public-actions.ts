"use server";

import { getCatalogProducts } from "@/lib/catalog";
import { CATALOG_PAGE_SIZE } from "@/lib/catalog/catalog-browse";
import type { CatalogListItem } from "@/lib/database.types";

export interface FetchPublicCatalogProductsInput {
  storeSlug: string;
  offset: number;
  limit?: number;
  categorySlug?: string | null;
  search?: string;
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
    const result = await getCatalogProducts({
      storeSlug: input.storeSlug,
      limit,
      offset: input.offset,
      categorySlug: input.categorySlug?.trim() || undefined,
      search: input.search?.trim() || undefined,
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
