"use client";

import { cn } from "@/lib/cn";
import {
  productBrandKey,
  type CatalogBrandOption,
} from "@/lib/catalog/product-brand";

interface StorefrontBrandRailProps {
  brands: CatalogBrandOption[];
  activeBrand: string | null;
  onSelectBrand: (brand: string | null) => void;
}

/**
 * Filtros rápidos por marca (estilo marketplace): un clic muestra solo esa vitrina.
 */
export function StorefrontBrandRail({
  brands,
  activeBrand,
  onSelectBrand,
}: StorefrontBrandRailProps) {
  if (brands.length === 0) return null;

  return (
    <section
      className="storefront-brand-rail"
      aria-labelledby="storefront-brand-rail-title"
    >
      <div className="storefront-brand-rail-head">
        <h2 id="storefront-brand-rail-title">Marcas</h2>
        <p>Filtrá por marca propia con un clic</p>
      </div>
      <ul className="storefront-brand-rail-track">
        <li>
          <button
            type="button"
            className={cn(
              "storefront-brand-chip",
              activeBrand == null && "is-active",
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
                "storefront-brand-chip",
                activeBrand != null &&
                  productBrandKey(activeBrand) === brand.key &&
                  "is-active",
              )}
              onClick={() => onSelectBrand(brand.name)}
            >
              {brand.name}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
