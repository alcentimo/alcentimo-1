"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CatalogListItem } from "@/lib/database.types";
import {
  browseCatalogProducts,
  CATALOG_INITIAL_FETCH,
  CATALOG_PAGE_SIZE,
  hasActiveCatalogBrowseFilters,
  hasActiveCatalogContentFilters,
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

function buildInitialProductsSignature(products: CatalogListItem[]): string {
  return products
    .map(
      (product) =>
        `${product.product_id}:${product.available_stock}:${product.updated_at ?? product.created_at}`,
    )
    .join("|");
}

export function useCatalogBrowse(
  initialProducts: CatalogListItem[],
  options?: UseCatalogBrowseOptions,
) {
  const pageSize = options?.pageSize ?? CATALOG_PAGE_SIZE;
  const serverPagination = options?.serverPagination;
  const initialProductsRef = useRef(initialProducts);
  initialProductsRef.current = initialProducts;

  const initialProductsSignature = useMemo(
    () => buildInitialProductsSignature(initialProducts),
    [initialProducts],
  );

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
  const [loadingFilter, setLoadingFilter] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchErrorSource, setFetchErrorSource] = useState<"filter" | "more" | null>(
    null,
  );
  const fetchRequestId = useRef(0);
  const [filterRetryNonce, setFilterRetryNonce] = useState(0);

  useEffect(() => {
    setAllProducts(initialProductsRef.current);
    setCatalogTotalCount(
      serverPagination?.initialTotalCount ?? initialProductsRef.current.length,
    );
    setVisibleCount(pageSize);
    setFetchError(null);
    setFetchErrorSource(null);
  }, [
    initialProductsSignature,
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

  const hasServerContentFilters = hasActiveCatalogContentFilters(
    searchQuery,
    categorySlug,
  );

  const runFilterFetch = useCallback(async () => {
    if (!serverPagination || !hasServerContentFilters) return;

    const requestId = ++fetchRequestId.current;
    setLoadingFilter(true);
    setFetchError(null);
    setFetchErrorSource(null);

    try {
      const result: FetchPublicCatalogProductsResult =
        await fetchPublicCatalogProducts({
          storeSlug: serverPagination.storeSlug,
          offset: 0,
          limit: CATALOG_INITIAL_FETCH,
          categorySlug,
          search: searchQuery,
        });

      if (requestId !== fetchRequestId.current) return;

      if (result.error) {
        setFetchError(result.error);
        setFetchErrorSource("filter");
        return;
      }

      setAllProducts(result.products);
      setCatalogTotalCount(result.totalCount);
    } finally {
      if (requestId === fetchRequestId.current) {
        setLoadingFilter(false);
      }
    }
  }, [categorySlug, hasServerContentFilters, searchQuery, serverPagination]);

  useEffect(() => {
    if (!serverPagination) return;

    if (!hasServerContentFilters) {
      setAllProducts(initialProductsRef.current);
      setCatalogTotalCount(serverPagination.initialTotalCount);
      setLoadingFilter(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void runFilterFetch();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [
    categorySlug,
    filterRetryNonce,
    hasServerContentFilters,
    runFilterFetch,
    searchQuery,
    serverPagination,
  ]);

  const browseResult = useMemo(
    () =>
      browseCatalogProducts(allProducts, {
        searchQuery:
          serverPagination && hasServerContentFilters ? "" : searchQuery,
        categorySlug:
          serverPagination && hasServerContentFilters ? null : categorySlug,
        sortKey,
        visibleCount,
      }),
    [
      allProducts,
      categorySlug,
      hasServerContentFilters,
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
    if (!serverPagination || loadingMore || loadingFilter) return false;

    setLoadingMore(true);
    setFetchError(null);
    setFetchErrorSource(null);

    try {
      const result = await fetchPublicCatalogProducts({
        storeSlug: serverPagination.storeSlug,
        offset: allProducts.length,
        limit: pageSize,
        categorySlug: hasServerContentFilters ? categorySlug : undefined,
        search: hasServerContentFilters ? searchQuery : undefined,
      });

      if (result.error) {
        setFetchError(result.error);
        setFetchErrorSource("more");
        return false;
      }

      setAllProducts((current) => mergeCatalogProducts(current, result.products));
      setCatalogTotalCount(result.totalCount);
      return true;
    } finally {
      setLoadingMore(false);
    }
  }, [
    allProducts.length,
    categorySlug,
    hasServerContentFilters,
    loadingFilter,
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

  const retryFetch = useCallback(() => {
    if (fetchErrorSource === "more") {
      void fetchMoreFromServer();
      return;
    }

    setFilterRetryNonce((value) => value + 1);
  }, [fetchErrorSource, fetchMoreFromServer]);

  function clearFilters() {
    setSearchQuery("");
    setCategorySlug(null);
    setSortKey("featured");
    setFetchError(null);
    setFetchErrorSource(null);
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
    loadingFilter,
    fetchError,
    fetchErrorSource,
    retryFetch,
    catalogTotalCount,
    ...browseResult,
    hasMore: browseResult.hasMore || serverHasMore,
  };
}
