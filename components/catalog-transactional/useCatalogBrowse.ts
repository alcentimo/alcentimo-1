"use client";

import { useEffect, useMemo, useState } from "react";
import type { CatalogListItem } from "@/lib/database.types";
import {
  browseCatalogProducts,
  CATALOG_PAGE_SIZE,
  hasActiveCatalogBrowseFilters,
  type CatalogSortKey,
} from "@/lib/catalog/catalog-browse";

interface UseCatalogBrowseOptions {
  initialCategorySlug?: string | null;
  pageSize?: number;
}

export function useCatalogBrowse(
  products: CatalogListItem[],
  options?: UseCatalogBrowseOptions,
) {
  const pageSize = options?.pageSize ?? CATALOG_PAGE_SIZE;
  const [searchQuery, setSearchQuery] = useState("");
  const [categorySlug, setCategorySlug] = useState<string | null>(
    options?.initialCategorySlug ?? null,
  );
  const [sortKey, setSortKey] = useState<CatalogSortKey>("featured");
  const [visibleCount, setVisibleCount] = useState(pageSize);

  useEffect(() => {
    setCategorySlug(options?.initialCategorySlug ?? null);
  }, [options?.initialCategorySlug]);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [searchQuery, categorySlug, sortKey, pageSize]);

  const browseResult = useMemo(
    () =>
      browseCatalogProducts(products, {
        searchQuery,
        categorySlug,
        sortKey,
        visibleCount,
      }),
    [products, searchQuery, categorySlug, sortKey, visibleCount],
  );

  const hasActiveFilters = hasActiveCatalogBrowseFilters(
    searchQuery,
    categorySlug,
    sortKey,
  );

  function loadMore() {
    setVisibleCount((current) => current + pageSize);
  }

  function clearFilters() {
    setSearchQuery("");
    setCategorySlug(null);
    setSortKey("featured");
  }

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
    ...browseResult,
  };
}
