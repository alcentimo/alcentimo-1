"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const currentMin = searchParams.get("min") ?? "";
  const currentMax = searchParams.get("max") ?? "";
  const currentSupplier = searchParams.get("supplier") ?? "";
  const currentCategory = searchParams.get("category") ?? "";

  const [minPrice, setMinPrice] = useState(currentMin);
  const [maxPrice, setMaxPrice] = useState(currentMax);

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/mercado-oculto?${qs}` : "/mercado-oculto");
    });
  }

  return (
    <aside className="mercado-mp-filters" aria-label="Filtros del catálogo">
      <div className="mercado-mp-filters-head">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Filtros
        </h2>
        <p className="text-xs text-zinc-500">{resultCount} productos</p>
      </div>

      <section className="mercado-mp-filter-block">
        <h3 className="mercado-mp-filter-title">Precio (USD)</h3>
        <div className="grid grid-cols-2 gap-2">
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
            pushParams((params) => {
              if (minPrice.trim()) params.set("min", minPrice.trim());
              else params.delete("min");
              if (maxPrice.trim()) params.set("max", maxPrice.trim());
              else params.delete("max");
            })
          }
        >
          Aplicar precio
        </button>
      </section>

      <section className="mercado-mp-filter-block">
        <h3 className="mercado-mp-filter-title">Categoría</h3>
        <ul className="mercado-mp-filter-list">
          <li>
            <button
              type="button"
              className={cn(
                "mercado-mp-filter-option",
                !currentCategory && "mercado-mp-filter-option-active",
              )}
              onClick={() =>
                pushParams((params) => {
                  params.delete("category");
                })
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
                  currentCategory === category.value &&
                    "mercado-mp-filter-option-active",
                )}
                onClick={() =>
                  pushParams((params) => {
                    params.set("category", category.value);
                  })
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
      </section>

      {facets.suppliers.length > 0 ? (
        <section className="mercado-mp-filter-block">
          <h3 className="mercado-mp-filter-title">Proveedor mayorista</h3>
          <ul className="mercado-mp-filter-list">
            <li>
              <button
                type="button"
                className={cn(
                  "mercado-mp-filter-option",
                  !currentSupplier && "mercado-mp-filter-option-active",
                )}
                onClick={() =>
                  pushParams((params) => {
                    params.delete("supplier");
                  })
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
                    currentSupplier === supplier.id &&
                      "mercado-mp-filter-option-active",
                  )}
                  onClick={() =>
                    pushParams((params) => {
                      params.set("supplier", supplier.id);
                    })
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
        </section>
      ) : null}

      {(currentMin ||
        currentMax ||
        currentSupplier ||
        currentCategory ||
        searchParams.get("q")) && (
        <button
          type="button"
          className="mercado-mp-filter-clear"
          onClick={() => {
            startTransition(() => {
              router.push("/mercado-oculto");
            });
          }}
        >
          Limpiar filtros
        </button>
      )}
    </aside>
  );
}
