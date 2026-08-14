"use client";

import { useEffect, useState } from "react";
import { useMercadoCatalog } from "@/components/mercado-oculto/MercadoCatalogProvider";
import type { MercadoCatalogFacets } from "@/lib/mercado-oculto/types";
import { cn } from "@/lib/cn";

interface MercadoFiltersPanelProps {
  facets: MercadoCatalogFacets;
  resultCount: number;
}

export function MercadoFiltersPanel({
  facets,
  resultCount,
}: MercadoFiltersPanelProps) {
  const { filters, setFilters, clearFilters, pending } = useMercadoCatalog();
  const [minPrice, setMinPrice] = useState(filters.min);
  const [maxPrice, setMaxPrice] = useState(filters.max);

  useEffect(() => {
    setMinPrice(filters.min);
    setMaxPrice(filters.max);
  }, [filters.min, filters.max]);

  const hasActive =
    Boolean(filters.q) ||
    Boolean(filters.category) ||
    Boolean(filters.min) ||
    Boolean(filters.max) ||
    Boolean(filters.supplier) ||
    filters.ship === "free";

  return (
    <aside className="mercado-mp-filters" aria-label="Filtros del catálogo">
      <div className="mercado-mp-filters-head">
        <h2>Filtros</h2>
        <p>{resultCount} productos</p>
      </div>

      <label className="mercado-mp-ship-toggle">
        <input
          type="checkbox"
          checked={filters.ship === "free"}
          disabled={pending}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              ship: event.target.checked ? "free" : "",
            }))
          }
        />
        <span>
          Envío gratis
          {facets.freeShippingCount > 0 ? (
            <em>({facets.freeShippingCount})</em>
          ) : null}
        </span>
      </label>

      <details className="mercado-mp-filter-block" open>
        <summary className="mercado-mp-filter-title">Precio (USD)</summary>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <label className="mercado-mp-filter-field">
            <span>Mín.</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
              placeholder={String(Math.floor(facets.priceMin) || 0)}
              disabled={pending}
            />
          </label>
          <label className="mercado-mp-filter-field">
            <span>Máx.</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              placeholder={String(Math.ceil(facets.priceMax) || 0)}
              disabled={pending}
            />
          </label>
        </div>
        <button
          type="button"
          className="mercado-mp-filter-apply"
          disabled={pending}
          onClick={() =>
            setFilters((current) => ({
              ...current,
              min: minPrice.trim(),
              max: maxPrice.trim(),
            }))
          }
        >
          Aplicar
        </button>
      </details>

      <details className="mercado-mp-filter-block" open>
        <summary className="mercado-mp-filter-title">Categorías</summary>
        <ul className="mercado-mp-filter-list pt-1">
          <li>
            <button
              type="button"
              className={cn(
                "mercado-mp-filter-option",
                !filters.category && "mercado-mp-filter-option-active",
              )}
              onClick={() =>
                setFilters((current) => ({ ...current, category: "" }))
              }
            >
              Todas
            </button>
          </li>
          {facets.categories.map((category) => (
            <li key={category.value}>
              <button
                type="button"
                className={cn(
                  "mercado-mp-filter-option",
                  filters.category === category.value &&
                    "mercado-mp-filter-option-active",
                )}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    category: category.value,
                  }))
                }
              >
                <span>{category.label}</span>
                <span className="tabular-nums text-zinc-400">
                  {category.count}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </details>

      {facets.suppliers.length > 0 ? (
        <details className="mercado-mp-filter-block" open>
          <summary className="mercado-mp-filter-title">Proveedor</summary>
          <ul className="mercado-mp-filter-list pt-1">
            <li>
              <button
                type="button"
                className={cn(
                  "mercado-mp-filter-option",
                  !filters.supplier && "mercado-mp-filter-option-active",
                )}
                onClick={() =>
                  setFilters((current) => ({ ...current, supplier: "" }))
                }
              >
                Todos
              </button>
            </li>
            {facets.suppliers.map((supplier) => (
              <li key={supplier.id}>
                <button
                  type="button"
                  className={cn(
                    "mercado-mp-filter-option",
                    filters.supplier === supplier.id &&
                      "mercado-mp-filter-option-active",
                  )}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      supplier: supplier.id,
                    }))
                  }
                >
                  <span className="truncate">{supplier.label}</span>
                  <span className="tabular-nums text-zinc-400">
                    {supplier.count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {hasActive ? (
        <button
          type="button"
          className="mercado-mp-filter-clear"
          onClick={clearFilters}
        >
          Limpiar filtros
        </button>
      ) : null}
    </aside>
  );
}
