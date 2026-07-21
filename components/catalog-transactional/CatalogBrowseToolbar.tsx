"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import type { CatalogCategoryOption } from "@/lib/catalog/extract-categories";
import { CATALOG_SORT_OPTIONS, type CatalogSortKey } from "@/lib/catalog/catalog-browse";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";

interface CatalogBrowseToolbarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  categorySlug: string | null;
  onCategorySlugChange: (slug: string | null) => void;
  sortKey: CatalogSortKey;
  onSortKeyChange: (value: CatalogSortKey) => void;
  categories: CatalogCategoryOption[];
  totalCount: number;
  filteredCount: number;
  hasActiveFilters: boolean;
  onClearFilters?: () => void;
  showCategoryFilter?: boolean;
}

export function CatalogBrowseToolbar({
  searchQuery,
  onSearchQueryChange,
  categorySlug,
  onCategorySlugChange,
  sortKey,
  onSortKeyChange,
  categories,
  totalCount,
  filteredCount,
  hasActiveFilters,
  onClearFilters,
  showCategoryFilter = true,
}: CatalogBrowseToolbarProps) {
  const showCategories = showCategoryFilter && categories.length > 0;

  return (
    <section
      className="catalog-browse-toolbar"
      aria-label="Buscar y filtrar productos"
    >
      <div className="catalog-browse-toolbar-row">
        <label className="catalog-browse-search" htmlFor="catalog-browse-search">
          <Search className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
          <input
            id="catalog-browse-search"
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Buscar productos..."
            className="catalog-browse-search-input"
            autoComplete="off"
            enterKeyHint="search"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchQueryChange("")}
              className="catalog-browse-search-clear"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </label>

        <div className="catalog-browse-sort">
          <SlidersHorizontal
            className="h-4 w-4 shrink-0 text-neutral-400"
            aria-hidden="true"
          />
          <Select
            id="catalog-browse-sort"
            value={sortKey}
            onChange={(event) =>
              onSortKeyChange(event.target.value as CatalogSortKey)
            }
            className="catalog-browse-sort-select"
            aria-label="Ordenar productos"
          >
            {CATALOG_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {showCategories ? (
        <div
          className="catalog-category-chips catalog-browse-category-chips"
          role="tablist"
          aria-label="Filtrar por categoría"
        >
          <button
            type="button"
            role="tab"
            aria-selected={categorySlug == null}
            onClick={() => onCategorySlugChange(null)}
            className={cn(
              "catalog-category-chip",
              categorySlug == null && "catalog-category-chip-active",
            )}
          >
            Todas
          </button>
          {categories.map((category) => (
            <button
              key={category.slug}
              type="button"
              role="tab"
              aria-selected={categorySlug === category.slug}
              onClick={() => onCategorySlugChange(category.slug)}
              className={cn(
                "catalog-category-chip",
                categorySlug === category.slug && "catalog-category-chip-active",
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="catalog-browse-meta">
        <p className="catalog-browse-count">
          {hasActiveFilters ? (
            <>
              Mostrando <strong>{filteredCount}</strong> de{" "}
              <strong>{totalCount}</strong> productos
            </>
          ) : (
            <>
              <strong>{totalCount}</strong> producto
              {totalCount === 1 ? "" : "s"} disponible
              {totalCount === 1 ? "" : "s"}
            </>
          )}
        </p>
        {hasActiveFilters && onClearFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="catalog-browse-clear"
          >
            Limpiar filtros
          </button>
        ) : null}
      </div>
    </section>
  );
}
