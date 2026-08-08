"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  Rows3,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { CatalogCategoryOption } from "@/lib/catalog/extract-categories";
import { CATALOG_SORT_OPTIONS, type CatalogSortKey } from "@/lib/catalog/catalog-browse";
import type { CatalogLayoutMode } from "@/lib/store-settings/types";
import { CATALOG_DESKTOP_LAYOUT_MQ } from "@/lib/catalog/catalog-layout";
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
  layout?: CatalogLayoutMode;
  onLayoutChange?: (layout: CatalogLayoutMode) => void;
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
  layout,
  onLayoutChange,
}: CatalogBrowseToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const shellNav = useCatalogShellNavigationOptional();
  const previewPortalContainer = useCatalogPreviewPortalContainer();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const handledBuscarDeepLinkRef = useRef(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isDesktopLayout, setIsDesktopLayout] = useState(false);
  const showCategories = showCategoryFilter && categories.length > 0;

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const media = window.matchMedia(CATALOG_DESKTOP_LAYOUT_MQ);
    const sync = () => setIsDesktopLayout(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
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

        {layout && onLayoutChange ? (
          <div
            className="catalog-layout-toggle"
            role="group"
            aria-label="Vista del catálogo"
          >
            <button
              type="button"
              className={cn(
                "catalog-layout-toggle-btn",
                layout === "list" && "catalog-layout-toggle-btn-active",
              )}
              aria-pressed={layout === "list"}
              aria-label={
                isDesktopLayout ? "Vista de 2 columnas" : "Vista de 1 columna"
              }
              title={isDesktopLayout ? "2 columnas" : "1 columna"}
              onClick={() => onLayoutChange("list")}
            >
              <Rows3 className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={cn(
                "catalog-layout-toggle-btn",
                layout === "grid" && "catalog-layout-toggle-btn-active",
              )}
              aria-pressed={layout === "grid"}
              aria-label={
                isDesktopLayout ? "Vista de 4 columnas" : "Vista de 2 columnas"
              }
              title={isDesktopLayout ? "4 columnas" : "2 columnas"}
              onClick={() => onLayoutChange("grid")}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="catalog-browse-meta">
        <div className="catalog-browse-meta-left">
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
