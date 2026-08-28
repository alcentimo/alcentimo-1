"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import type { CatalogCategoryOption } from "@/lib/catalog/extract-categories";
import {
  productBrandKey,
  type CatalogBrandOption,
} from "@/lib/catalog/product-brand";

export interface StorefrontFilterCategory extends CatalogCategoryOption {
  count?: number;
}

interface StorefrontFiltersPanelProps {
  categories: StorefrontFilterCategory[];
  activeCategorySlug: string | null;
  onSelectCategory: (slug: string | null) => void;
  minPrice: string;
  maxPrice: string;
  onApplyPrice: (min: string, max: string) => void;
  onClear: () => void;
  resultCount: number;
  priceMinPlaceholder?: string;
  priceMaxPlaceholder?: string;
  pending?: boolean;
  hasActiveFilters?: boolean;
  brands?: CatalogBrandOption[];
  activeBrand?: string | null;
  onSelectBrand?: (brand: string | null) => void;
}

/** Filtros rápidos de departamento: precio (USD) y categoría. */
export function StorefrontFiltersPanel({
  categories,
  activeCategorySlug,
  onSelectCategory,
  minPrice,
  maxPrice,
  onApplyPrice,
  onClear,
  resultCount,
  priceMinPlaceholder = "0",
  priceMaxPlaceholder = "0",
  pending = false,
  hasActiveFilters = false,
  brands = [],
  activeBrand = null,
  onSelectBrand,
}: StorefrontFiltersPanelProps) {
  const [draftMin, setDraftMin] = useState(minPrice);
  const [draftMax, setDraftMax] = useState(maxPrice);

  useEffect(() => {
    setDraftMin(minPrice);
    setDraftMax(maxPrice);
  }, [minPrice, maxPrice]);

  return (
    <div className="storefront-mp-filters-inner">
      <div className="mercado-mp-filters-head">
        <h2>Filtros</h2>
        <p>
          {resultCount} producto{resultCount === 1 ? "" : "s"}
        </p>
      </div>

      <details className="mercado-mp-filter-block" open>
        <summary className="mercado-mp-filter-title">Precio (USD)</summary>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <label className="mercado-mp-filter-field">
            <span>Mín.</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={draftMin}
              onChange={(event) => setDraftMin(event.target.value)}
              placeholder={priceMinPlaceholder}
              disabled={pending}
            />
          </label>
          <label className="mercado-mp-filter-field">
            <span>Máx.</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={draftMax}
              onChange={(event) => setDraftMax(event.target.value)}
              placeholder={priceMaxPlaceholder}
              disabled={pending}
            />
          </label>
        </div>
        <button
          type="button"
          className="mercado-mp-filter-apply"
          disabled={pending}
          onClick={() => onApplyPrice(draftMin.trim(), draftMax.trim())}
        >
          Aplicar
        </button>
      </details>

      {categories.length > 0 ? (
        <details className="mercado-mp-filter-block" open>
          <summary className="mercado-mp-filter-title">Categorías</summary>
          <ul className="mercado-mp-filter-list pt-1">
            <li>
              <button
                type="button"
                className={cn(
                  "mercado-mp-filter-option",
                  !activeCategorySlug && "mercado-mp-filter-option-active",
                )}
                onClick={() => onSelectCategory(null)}
              >
                Todas
              </button>
            </li>
            {categories.map((category) => (
              <li key={category.slug}>
                <button
                  type="button"
                  className={cn(
                    "mercado-mp-filter-option",
                    activeCategorySlug === category.slug &&
                      "mercado-mp-filter-option-active",
                  )}
                  onClick={() => onSelectCategory(category.slug)}
                >
                  <span>{category.name}</span>
                  {category.count != null ? (
                    <span className="tabular-nums text-zinc-400">
                      {category.count}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {brands.length > 0 && onSelectBrand ? (
        <details className="mercado-mp-filter-block" open>
          <summary className="mercado-mp-filter-title">Marcas</summary>
          <ul className="mercado-mp-filter-list pt-1">
            <li>
              <button
                type="button"
                className={cn(
                  "mercado-mp-filter-option",
                  !activeBrand && "mercado-mp-filter-option-active",
                )}
                onClick={() => onSelectBrand(null)}
              >
                Todas
              </button>
            </li>
            {brands.map((brand) => (
              <li key={brand.key}>
                <button
                  type="button"
                  className={cn(
                    "mercado-mp-filter-option",
                    activeBrand != null &&
                      productBrandKey(activeBrand) === brand.key &&
                      "mercado-mp-filter-option-active",
                  )}
                  onClick={() => onSelectBrand(brand.name)}
                >
                  <span>{brand.name}</span>
                  <span className="tabular-nums text-zinc-400">
                    {brand.count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {hasActiveFilters ? (
        <button type="button" className="mercado-mp-filter-clear" onClick={onClear}>
          Limpiar filtros
        </button>
      ) : null}
    </div>
  );
}
