"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CatalogListItem } from "@/lib/database.types";
import {
  browseCatalogProducts,
  CATALOG_INITIAL_FETCH,
  CATALOG_PAGE_SIZE,
  hasActiveCatalogBrowseFilters,
  type CatalogSortKey,
} from "@/lib/catalog/catalog-browse";
import {
  fetchPublicCatalogProducts,
  type FetchPublicCatalogProductsResult,
} from "@/lib/catalog/public-actions";

interface UseCatalogBrowseOptions {
  initialCategorySlug?: string | null;
  pageSize?: number;
  /** Paginación server-side para catálogos grandes. */
  serverPagination?: {
    storeSlug: string;
    initialTotalCount: number;
  };
}

function mergeCatalogProducts(
  current: CatalogListItem[],
  incoming: CatalogListItem[],
): CatalogListItem[] {
  if (incoming.length === 0) return current;

  const seen = new Set(current.map((product) => product.product_id));
  const merged = [...current];

  for (const product of incoming) {
    if (seen.has(product.product_id)) continue;
    seen.add(product.product_id);
    merged.push(product);
  }

  return merged;
}

export function useCatalogBrowse(
  initialProducts: CatalogListItem[],
  options?: UseCatalogBrowseOptions,
) {
  const pageSize = options?.pageSize ?? CATALOG_PAGE_SIZE;
  const serverPagination = options?.serverPagination;
  const [allProducts, setAllProducts] = useState(initialProducts);
  const [catalogTotalCount, setCatalogTotalCount] = useState(
    serverPagination?.initialTotalCount ?? initialProducts.length,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [categorySlug, setCategorySlug] = useState<string | null>(
    options?.initialCategorySlug ?? null,
  );
  const [sortKey, setSortKey] = useState<CatalogSortKey>("featured");
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const fetchRequestId = useRef(0);

  useEffect(() => {
    setAllProducts(initialProducts);
    setCatalogTotalCount(
      serverPagination?.initialTotalCount ?? initialProducts.length,
    );
    setVisibleCount(pageSize);
    setFetchError(null);
  }, [
    initialProducts,
    pageSize,
    serverPagination?.initialTotalCount,
    serverPagination?.storeSlug,
  ]);

  useEffect(() => {
    setCategorySlug(options?.initialCategorySlug ?? null);
  }, [options?.initialCategorySlug]);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [searchQuery, categorySlug, sortKey, pageSize]);

  const hasServerFilters = hasActiveCatalogBrowseFilters(
    searchQuery,
    categorySlug,
    sortKey,
  );

  useEffect(() => {
    if (!serverPagination) return;

    if (!hasServerFilters) {
      setAllProducts(initialProducts);
      setCatalogTotalCount(serverPagination.initialTotalCount);
      return;
    }

    const requestId = ++fetchRequestId.current;
    const timer = window.setTimeout(async () => {
      setLoadingMore(true);
      setFetchError(null);

      const result: FetchPublicCatalogProductsResult =
        await fetchPublicCatalogProducts({
          storeSlug: serverPagination.storeSlug,
          offset: 0,
          limit: CATALOG_INITIAL_FETCH,
          categorySlug,
          search: searchQuery,
        });

      if (requestId !== fetchRequestId.current) return;

      setLoadingMore(false);

      if (result.error) {
        setFetchError(result.error);
        return;
      }

      setAllProducts(result.products);
      setCatalogTotalCount(result.totalCount);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [
    categorySlug,
    hasServerFilters,
    initialProducts,
    searchQuery,
    serverPagination,
  ]);

  const browseResult = useMemo(
    () =>
      browseCatalogProducts(allProducts, {
        searchQuery: serverPagination && hasServerFilters ? "" : searchQuery,
        categorySlug: serverPagination && hasServerFilters ? null : categorySlug,
        sortKey,
        visibleCount,
      }),
    [
      allProducts,
      categorySlug,
      hasServerFilters,
      searchQuery,
      serverPagination,
      sortKey,
      visibleCount,
    ],
  );

  const hasActiveFilters = hasActiveCatalogBrowseFilters(
    searchQuery,
    categorySlug,
    sortKey,
  );

  const fetchMoreFromServer = useCallback(async () => {
    if (!serverPagination || loadingMore) return false;

    setLoadingMore(true);
    setFetchError(null);

    const result = await fetchPublicCatalogProducts({
      storeSlug: serverPagination.storeSlug,
      offset: allProducts.length,
      limit: pageSize,
      categorySlug: hasServerFilters ? categorySlug : undefined,
      search: hasServerFilters ? searchQuery : undefined,
    });

    setLoadingMore(false);

    if (result.error) {
      setFetchError(result.error);
      return false;
    }

    setAllProducts((current) => mergeCatalogProducts(current, result.products));
    setCatalogTotalCount(result.totalCount);
    return true;
  }, [
    allProducts.length,
    categorySlug,
    hasServerFilters,
    loadingMore,
    pageSize,
    searchQuery,
    serverPagination,
  ]);

  const loadMore = useCallback(() => {
    const nextVisible = visibleCount + pageSize;
    setVisibleCount(nextVisible);

    if (!serverPagination) return;

    const needsServerFetch =
      nextVisible > allProducts.length && allProducts.length < catalogTotalCount;

    if (needsServerFetch) {
      void fetchMoreFromServer();
    }
  }, [
    allProducts.length,
    catalogTotalCount,
    fetchMoreFromServer,
    pageSize,
    serverPagination,
    visibleCount,
  ]);

  function clearFilters() {
    setSearchQuery("");
    setCategorySlug(null);
    setSortKey("featured");
  }

  const serverHasMore =
    serverPagination != null && allProducts.length < catalogTotalCount;

  return {
    searchQuery,
    setSearchQuery,
    categorySlug,
    setCategorySlug,
    sortKey,
    setSortKey,
    visibleCount,
    loadMore,
    clearFilters,
    hasActiveFilters,
    loadingMore,
    fetchError,
    catalogTotalCount,
    ...browseResult,
    hasMore: browseResult.hasMore || serverHasMore,
  };
}
