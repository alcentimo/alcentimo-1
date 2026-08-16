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
            <h1 className="mercado-heading text-lg sm:text-xl">
              {filters.q
                ? `Resultados para “${filters.q}”`
                : "Selección curada"}
            </h1>
            <p className="mercado-subheading mt-0.5">
              Vitrina mayorista · Envío nacional · Compra protegida
            </p>
          </div>
          <p className="text-sm text-[var(--mo-muted)]" aria-live="polite">
            <strong className="font-semibold text-[var(--mo-ink)]">
              {filteredProducts.length}
            </strong>{" "}
            resultado{filteredProducts.length === 1 ? "" : "s"}
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
