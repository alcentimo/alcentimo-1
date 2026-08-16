"use client";

import { useMercadoCatalog } from "@/components/mercado-oculto/MercadoCatalogProvider";
import { MercadoFiltersPanel } from "@/components/mercado-oculto/MercadoFiltersPanel";
import { MercadoProductGrid } from "@/components/mercado-oculto/MercadoProductGrid";
import { MercadoCatalogSkeleton } from "@/components/mercado-oculto/MercadoCatalogSkeleton";
import { cn } from "@/lib/cn";

export function MercadoCatalogView() {
  const { filteredProducts, filters, facets, pending, error } =
    useMercadoCatalog();

  return (
    <div className="mercado-mp-layout">
      <MercadoFiltersPanel facets={facets} resultCount={filteredProducts.length} />

      <div className="mercado-mp-results">
        <div className="mercado-mp-results-head">
          <div>
            <p className="mercado-section-label">Colección activa</p>
            <h2 className="mercado-heading text-xl sm:text-2xl">
              {filters.q
                ? `Resultados para “${filters.q}”`
                : filters.category
                  ? "Selección filtrada"
                  : "Piezas destacadas"}
            </h2>
            <p className="mercado-subheading mt-1">
              Márgenes claros · Fichas listas · Compra protegida
            </p>
          </div>
          <p className="mercado-mp-results-count" aria-live="polite">
            <strong>{filteredProducts.length}</strong>
            <span>
              {" "}
              pieza{filteredProducts.length === 1 ? "" : "s"}
            </span>
          </p>
        </div>

        {error ? (
          <p className="mercado-alert" role="alert">
            No se pudo cargar la vitrina ({error}).
          </p>
        ) : (
          <div
            className={cn(
              "mercado-mp-results-body",
              pending && "mercado-mp-results-pending",
            )}
          >
            {pending ? <MercadoCatalogSkeleton compact /> : null}
            <MercadoProductGrid products={filteredProducts} />
          </div>
        )}
      </div>
    </div>
  );
}
