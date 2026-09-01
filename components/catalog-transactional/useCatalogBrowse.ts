"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CatalogListItem } from "@/lib/database.types";
import {
  browseCatalogProducts,
  CATALOG_INITIAL_FETCH,
  CATALOG_PAGE_SIZE,
  CATALOG_SEARCH_DEBOUNCE_MS,
  hasActiveCatalogBrowseFilters,
  hasActiveCatalogContentFilters,
  type CatalogSortKey,
} from "@/lib/catalog/catalog-browse";
import { fetchPublicCatalogProducts } from "@/lib/catalog/public-actions";

interface UseCatalogBrowseOptions {
  initialCategorySlug?: string | null;
  initialSearchQuery?: string | null;
  initialBrand?: string | null;
  pageSize?: number;
  /** Paginación server-side para catálogos grandes. */
  serverPagination?: {
    storeSlug: string;
    initialTotalCount: number;
  };
  /** Escribe `?q=` con history.replaceState (no en vista previa del dashboard). */
  syncSearchToUrl?: boolean;
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
        `${product.product_id}:${product.available_stock}:${product.created_at}`,
    )
    .join("|");
}

function arraysEqualById(a: CatalogListItem[], b: CatalogListItem[]): boolean {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index]?.product_id !== b[index]?.product_id) return false;
  }
  return true;
}

export function useCatalogBrowse(
  initialProducts: CatalogListItem[],
  options?: UseCatalogBrowseOptions,
) {
  const pageSize = options?.pageSize ?? CATALOG_PAGE_SIZE;
  const serverStoreSlug = options?.serverPagination?.storeSlug ?? null;
  const serverInitialTotalCount =
    options?.serverPagination?.initialTotalCount ?? initialProducts.length;
  const serverPaginationEnabled = serverStoreSlug != null;
  const syncSearchToUrl = options?.syncSearchToUrl === true;

  const initialProductsRef = useRef(initialProducts);
  initialProductsRef.current = initialProducts;

  const initialProductsSignature = useMemo(
    () => buildInitialProductsSignature(initialProducts),
    [initialProducts],
  );

  const [allProducts, setAllProducts] = useState(initialProducts);
  const [catalogTotalCount, setCatalogTotalCount] = useState(
    serverPaginationEnabled ? serverInitialTotalCount : initialProducts.length,
  );
  const [searchQuery, setSearchQuery] = useState(
    () => options?.initialSearchQuery?.trim() ?? "",
  );
  const [appliedSearchQuery, setAppliedSearchQuery] = useState(searchQuery);
  const [categorySlug, setCategorySlug] = useState<string | null>(
    options?.initialCategorySlug ?? null,
  );
  const [brand, setBrand] = useState<string | null>(
    () => options?.initialBrand?.trim() || null,
  );
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortKey, setSortKey] = useState<CatalogSortKey>("featured");
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingFilter, setLoadingFilter] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchErrorSource, setFetchErrorSource] = useState<"filter" | "more" | null>(
    null,
  );
  const fetchRequestId = useRef(0);
  const loadMoreInFlightRef = useRef(false);
  const [filterRetryNonce, setFilterRetryNonce] = useState(0);

  useEffect(() => {
    if (searchQuery === appliedSearchQuery) return;
    const timer = window.setTimeout(() => {
      setAppliedSearchQuery(searchQuery);
    }, CATALOG_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [appliedSearchQuery, searchQuery]);

  const commitSearchQuery = useCallback(() => {
    setAppliedSearchQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (!syncSearchToUrl || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const next = appliedSearchQuery.trim();
    const current = url.searchParams.get("q") ?? "";
    if (next === current) return;
    if (next) url.searchParams.set("q", next);
    else url.searchParams.delete("q");
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, [appliedSearchQuery, syncSearchToUrl]);

  const hasServerContentFilters = hasActiveCatalogContentFilters(
    appliedSearchQuery,
    categorySlug,
    minPrice,
    maxPrice,
    brand,
  );

  useEffect(() => {
    const nextProducts = initialProductsRef.current;
    setAllProducts((current) =>
      arraysEqualById(current, nextProducts) ? current : nextProducts,
    );
    setCatalogTotalCount(
      serverPaginationEnabled ? serverInitialTotalCount : nextProducts.length,
    );
    setVisibleCount(pageSize);
    setFetchError(null);
    setFetchErrorSource(null);
  }, [
    initialProductsSignature,
    pageSize,
    serverInitialTotalCount,
    serverPaginationEnabled,
    serverStoreSlug,
  ]);

  useEffect(() => {
    setCategorySlug(options?.initialCategorySlug ?? null);
  }, [options?.initialCategorySlug]);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [appliedSearchQuery, categorySlug, brand, minPrice, maxPrice, sortKey, pageSize]);

  useEffect(() => {
    if (!serverPaginationEnabled || hasServerContentFilters) return;

    const nextProducts = initialProductsRef.current;
    setAllProducts((current) =>
      arraysEqualById(current, nextProducts) ? current : nextProducts,
    );
    setCatalogTotalCount(serverInitialTotalCount);
    setLoadingFilter(false);
  }, [
    hasServerContentFilters,
    initialProductsSignature,
    serverInitialTotalCount,
    serverPaginationEnabled,
  ]);

  useEffect(() => {
    if (!serverPaginationEnabled || !hasServerContentFilters) return;

    const requestId = ++fetchRequestId.current;
    let cancelled = false;

    void (async () => {
      setLoadingFilter(true);
      setFetchError(null);
      setFetchErrorSource(null);

      try {
        const result = await fetchPublicCatalogProducts({
          storeSlug: serverStoreSlug,
          offset: 0,
          limit: CATALOG_INITIAL_FETCH,
          categorySlug,
          brand,
          search: appliedSearchQuery,
          minPrice,
          maxPrice,
        });

        if (cancelled || requestId !== fetchRequestId.current) return;

        if (result.error) {
          setFetchError(result.error);
          setFetchErrorSource("filter");
          return;
        }

        setAllProducts(result.products);
        setCatalogTotalCount(result.totalCount);
      } finally {
        if (!cancelled && requestId === fetchRequestId.current) {
          setLoadingFilter(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    appliedSearchQuery,
    categorySlug,
    brand,
    filterRetryNonce,
    hasServerContentFilters,
    maxPrice,
    minPrice,
    serverPaginationEnabled,
    serverStoreSlug,
  ]);

  const browseResult = useMemo(
    () =>
      browseCatalogProducts(allProducts, {
        searchQuery:
          serverPaginationEnabled && hasServerContentFilters ? "" : appliedSearchQuery,
        categorySlug:
          serverPaginationEnabled && hasServerContentFilters ? null : categorySlug,
        brand:
          serverPaginationEnabled && hasServerContentFilters ? null : brand,
        minPrice:
          serverPaginationEnabled && hasServerContentFilters ? "" : minPrice,
        maxPrice:
          serverPaginationEnabled && hasServerContentFilters ? "" : maxPrice,
        sortKey,
        visibleCount,
      }),
    [
      allProducts,
      categorySlug,
      brand,
      hasServerContentFilters,
      maxPrice,
      minPrice,
      appliedSearchQuery,
      serverPaginationEnabled,
      sortKey,
      visibleCount,
    ],
  );

  const hasActiveFilters = hasActiveCatalogBrowseFilters(
    searchQuery.trim() ? searchQuery : appliedSearchQuery,
    categorySlug,
    sortKey,
    minPrice,
    maxPrice,
    brand,
  );

  const fetchMoreFromServer = useCallback(async () => {
    if (
      !serverPaginationEnabled ||
      !serverStoreSlug ||
      loadMoreInFlightRef.current ||
      loadingMore ||
      loadingFilter
    ) {
      return false;
    }

    loadMoreInFlightRef.current = true;
    setLoadingMore(true);
    setFetchError(null);
    setFetchErrorSource(null);

    try {
      const result = await fetchPublicCatalogProducts({
        storeSlug: serverStoreSlug,
        offset: allProducts.length,
        limit: pageSize,
        categorySlug: hasServerContentFilters ? categorySlug : undefined,
        brand: hasServerContentFilters ? brand : undefined,
        search: hasServerContentFilters ? appliedSearchQuery : undefined,
        minPrice: hasServerContentFilters ? minPrice : undefined,
        maxPrice: hasServerContentFilters ? maxPrice : undefined,
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
      loadMoreInFlightRef.current = false;
      setLoadingMore(false);
    }
  }, [
    allProducts.length,
    categorySlug,
    brand,
    hasServerContentFilters,
    loadingFilter,
    loadingMore,
    maxPrice,
    minPrice,
    pageSize,
    appliedSearchQuery,
    serverPaginationEnabled,
    serverStoreSlug,
  ]);

  const loadMore = useCallback(() => {
    if (loadMoreInFlightRef.current || loadingMore || loadingFilter) return;

    const nextVisible = visibleCount + pageSize;
    setVisibleCount(nextVisible);

    if (!serverPaginationEnabled) return;

    const needsServerFetch =
      nextVisible > allProducts.length && allProducts.length < catalogTotalCount;

    if (needsServerFetch) {
      void fetchMoreFromServer();
    }
  }, [
    allProducts.length,
    catalogTotalCount,
    fetchMoreFromServer,
    loadingFilter,
    loadingMore,
    pageSize,
    serverPaginationEnabled,
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
    setAppliedSearchQuery("");
    setCategorySlug(null);
    setBrand(null);
    setMinPrice("");
    setMaxPrice("");
    setSortKey("featured");
    setFetchError(null);
    setFetchErrorSource(null);
  }

  const serverHasMore =
    serverPaginationEnabled && allProducts.length < catalogTotalCount;

  return {
    searchQuery,
    appliedSearchQuery,
    setSearchQuery,
    commitSearchQuery,
    categorySlug,
    setCategorySlug,
    brand,
    setBrand,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
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
