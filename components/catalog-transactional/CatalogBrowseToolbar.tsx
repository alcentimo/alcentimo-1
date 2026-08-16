"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, Search, SlidersHorizontal, X } from "lucide-react";
import type { CatalogCategoryOption } from "@/lib/catalog/extract-categories";
import { CATALOG_SORT_OPTIONS, type CatalogSortKey } from "@/lib/catalog/catalog-browse";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import {
  useCatalogShellNavigationOptional,
  useRegisterCatalogSearchFocus,
} from "@/components/catalog-transactional/CatalogShellNavigation";
import { useCatalogPreviewPortalContainer } from "@/components/dashboard/CatalogPreviewPortalContext";

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
  /** Kicker del hero marketplace (p. ej. Catálogo / Menú). */
  storeEyebrow?: string;
  storeName?: string;
  storeDescription?: string | null;
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
  storeEyebrow = "Catálogo",
  storeName,
  storeDescription = null,
}: CatalogBrowseToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const shellNav = useCatalogShellNavigationOptional();
  const previewPortalContainer = useCatalogPreviewPortalContainer();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const handledBuscarDeepLinkRef = useRef(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const showCategories = showCategoryFilter && categories.length > 0;
  const lead = storeDescription?.trim() || null;

  const activeCategoryName =
    categorySlug == null
      ? null
      : categories.find((category) => category.slug === categorySlug)?.name ??
        null;

  const focusSearchInput = useCallback(() => {
    const input = searchInputRef.current;
    if (!input) return;
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      input.focus({ preventScroll: true });
      input.select();
    }, 180);
  }, []);

  useRegisterCatalogSearchFocus(focusSearchInput);

  useEffect(() => {
    if (handledBuscarDeepLinkRef.current) return;
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("buscar") !== "1") return;

    handledBuscarDeepLinkRef.current = true;
    shellNav?.focusSearch();
    focusSearchInput();

    url.searchParams.delete("buscar");
    const query = url.searchParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [focusSearchInput, pathname, router, shellNav]);

  return (
    <section
      className="catalog-browse-toolbar catalog-browse-toolbar--marketplace"
      aria-label="Buscar y filtrar productos"
    >
      <div className="catalog-mp-hero">
        <div className="catalog-mp-hero-glow" aria-hidden="true" />
        <div className="catalog-mp-hero-inner">
          <p className="catalog-mp-hero-kicker">{storeEyebrow}</p>
          <h2 className="catalog-mp-hero-title">
            {storeName ? (
              <>
                La vitrina de{" "}
                <span className="catalog-mp-hero-title-accent">{storeName}</span>
              </>
            ) : (
              <>
                Encuentra lo que{" "}
                <span className="catalog-mp-hero-title-accent">buscas</span>
              </>
            )}
          </h2>
          {lead ? <p className="catalog-mp-hero-lead">{lead}</p> : null}

          <form
            className="catalog-browse-search-hero"
            onSubmit={(event) => {
              event.preventDefault();
              focusSearchInput();
            }}
          >
            <span className="catalog-mp-search-icon" aria-hidden="true">
              <Search className="h-5 w-5" />
            </span>
            <input
              ref={searchInputRef}
              id="catalog-browse-search"
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              onFocus={() => shellNav?.focusSearch()}
              onBlur={() => {
                window.setTimeout(() => {
                  if (document.activeElement === searchInputRef.current) return;
                  shellNav?.clearSearchActive();
                }, 200);
              }}
              placeholder="Buscar productos o categorías…"
              className="catalog-browse-search-input"
              autoComplete="off"
              enterKeyHint="search"
              aria-label="Buscar productos"
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
            <button type="submit" className="catalog-mp-search-btn">
              Explorar
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>

          {showCategories ? (
            <div
              className="catalog-browse-collections"
              role="tablist"
              aria-label="Categorías"
            >
              <button
                type="button"
                role="tab"
                aria-selected={categorySlug == null}
                className={cn(
                  "catalog-browse-collection",
                  categorySlug == null && "is-active",
                )}
                onClick={() => onCategorySlugChange(null)}
              >
                Todas
              </button>
              {categories.map((category) => (
                <button
                  key={category.slug}
                  type="button"
                  role="tab"
                  aria-selected={categorySlug === category.slug}
                  className={cn(
                    "catalog-browse-collection",
                    categorySlug === category.slug && "is-active",
                  )}
                  onClick={() => onCategorySlugChange(category.slug)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="catalog-browse-meta catalog-mp-results-bar">
        <div className="catalog-browse-meta-left">
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
              <span
                className="catalog-browse-filters-btn-dot"
                aria-hidden="true"
              />
            ) : null}
          </button>
          <div className="catalog-mp-results-copy">
            <p className="catalog-mp-results-label">Colección activa</p>
            <p className="catalog-browse-count">
              {hasActiveFilters ? (
                <>
                  Mostrando <strong>{filteredCount}</strong> de{" "}
                  <strong>{totalCount}</strong>
                  {activeCategoryName ? (
                    <>
                      {" "}
                      en <strong>{activeCategoryName}</strong>
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <strong>{totalCount}</strong> producto
                  {totalCount === 1 ? "" : "s"}
                </>
              )}
            </p>
          </div>
          {hasActiveFilters && onClearFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="catalog-browse-clear"
            >
              Limpiar
            </button>
          ) : null}
        </div>

        <label className="catalog-browse-sort">
          <span className="sr-only">Ordenar productos</span>
          <select
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
          </select>
        </label>
      </div>

      <Sheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        side="bottom"
        className="catalog-browse-filters-overlay"
        container={previewPortalContainer}
        lockScroll={!previewPortalContainer}
      >
        <SheetContent
          unstyledSide
          className="catalog-browse-filters-sheet"
          onClose={() => setFiltersOpen(false)}
        >
          <div className="catalog-browse-filters-handle" aria-hidden="true">
            <span className="catalog-browse-filters-handle-bar" />
          </div>
          <SheetHeader className="catalog-browse-filters-header">
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
