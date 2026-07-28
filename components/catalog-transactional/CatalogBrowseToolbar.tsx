"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import type { CatalogCategoryOption } from "@/lib/catalog/extract-categories";
import { CATALOG_SORT_OPTIONS, type CatalogSortKey } from "@/lib/catalog/catalog-browse";
import { Select } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/cn";

const MAX_VISIBLE_CATEGORY_CHIPS = 4;

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

function splitVisibleCategories(
  categories: CatalogCategoryOption[],
  activeSlug: string | null,
): {
  visible: CatalogCategoryOption[];
  overflow: CatalogCategoryOption[];
} {
  if (categories.length <= MAX_VISIBLE_CATEGORY_CHIPS) {
    return { visible: categories, overflow: [] };
  }

  const activeIndex = activeSlug
    ? categories.findIndex((category) => category.slug === activeSlug)
    : -1;

  if (activeIndex >= MAX_VISIBLE_CATEGORY_CHIPS) {
    const active = categories[activeIndex];
    const leading = categories.slice(0, MAX_VISIBLE_CATEGORY_CHIPS - 1);
    const visible = [...leading, active];
    const visibleSlugs = new Set(visible.map((category) => category.slug));
    const overflow = categories.filter((category) => !visibleSlugs.has(category.slug));
    return { visible, overflow };
  }

  return {
    visible: categories.slice(0, MAX_VISIBLE_CATEGORY_CHIPS),
    overflow: categories.slice(MAX_VISIBLE_CATEGORY_CHIPS),
  };
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
  const [moreOpen, setMoreOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const showCategories = showCategoryFilter && categories.length > 1;

  const { visible: visibleCategories, overflow: overflowCategories } = useMemo(
    () => splitVisibleCategories(categories, categorySlug),
    [categories, categorySlug],
  );

  const activeOverflowCategory = overflowCategories.find(
    (category) => category.slug === categorySlug,
  );

  return (
    <section
      className="catalog-browse-toolbar"
      aria-label="Buscar y filtrar productos"
    >
      <div className="catalog-browse-toolbar-row">
        <button
          type="button"
          className={cn(
            "catalog-browse-filters-btn",
            hasActiveFilters && "catalog-browse-filters-btn-active",
          )}
          aria-label="Abrir filtros"
          aria-expanded={filtersOpen}
          aria-haspopup="dialog"
          onClick={() => setFiltersOpen(true)}
        >
          <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="catalog-browse-filters-btn-label">Filtros</span>
          {hasActiveFilters ? (
            <span className="catalog-browse-filters-btn-dot" aria-hidden="true" />
          ) : null}
        </button>

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

          {visibleCategories.map((category) => (
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

          {overflowCategories.length > 0 ? (
            <div className="catalog-category-more">
              <button
                type="button"
                className={cn(
                  "catalog-category-chip catalog-category-more-trigger",
                  activeOverflowCategory && "catalog-category-chip-active",
                )}
                aria-expanded={moreOpen}
                aria-haspopup="listbox"
                onClick={() => setMoreOpen((open) => !open)}
              >
                {activeOverflowCategory ? activeOverflowCategory.name : "Ver más"}
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform",
                    moreOpen && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              </button>

              {moreOpen ? (
                <>
                  <button
                    type="button"
                    className="catalog-category-more-backdrop"
                    aria-label="Cerrar categorías"
                    onClick={() => setMoreOpen(false)}
                  />
                  <ul
                    className="catalog-category-more-menu"
                    role="listbox"
                    aria-label="Más categorías"
                  >
                    {overflowCategories.map((category) => (
                      <li key={category.slug} role="presentation">
                        <button
                          type="button"
                          role="option"
                          aria-selected={categorySlug === category.slug}
                          className={cn(
                            "catalog-category-more-option",
                            categorySlug === category.slug &&
                              "catalog-category-more-option-active",
                          )}
                          onClick={() => {
                            onCategorySlugChange(category.slug);
                            setMoreOpen(false);
                          }}
                        >
                          {category.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="catalog-browse-meta">
        <div className="catalog-browse-meta-left">
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

        <div className="catalog-browse-sort">
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

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent
          className="catalog-browse-filters-sheet"
          onClose={() => setFiltersOpen(false)}
        >
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription>
              Afina el catálogo por categoría
              {searchQuery.trim() ? " y búsqueda activa" : ""}.
            </SheetDescription>
          </SheetHeader>

          <div className="catalog-browse-filters-body">
            {showCategories ? (
              <div className="catalog-browse-filters-section">
                <p className="catalog-browse-filters-label">Categoría</p>
                <ul className="catalog-browse-filters-list">
                  <li>
                    <button
                      type="button"
                      className={cn(
                        "catalog-browse-filters-option",
                        categorySlug == null &&
                          "catalog-browse-filters-option-active",
                      )}
                      onClick={() => {
                        onCategorySlugChange(null);
                        setFiltersOpen(false);
                      }}
                    >
                      Todas
                    </button>
                  </li>
                  {categories.map((category) => (
                    <li key={category.slug}>
                      <button
                        type="button"
                        className={cn(
                          "catalog-browse-filters-option",
                          categorySlug === category.slug &&
                            "catalog-browse-filters-option-active",
                        )}
                        onClick={() => {
                          onCategorySlugChange(category.slug);
                          setFiltersOpen(false);
                        }}
                      >
                        {category.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="catalog-browse-filters-empty">
                No hay filtros adicionales por ahora. Usa la búsqueda para
                encontrar productos.
              </p>
            )}
          </div>

          {hasActiveFilters && onClearFilters ? (
            <div className="catalog-browse-filters-footer">
              <button
                type="button"
                className="btn-secondary w-full"
                onClick={() => {
                  onClearFilters();
                  setFiltersOpen(false);
                }}
              >
                Limpiar filtros
              </button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </section>
  );
}
