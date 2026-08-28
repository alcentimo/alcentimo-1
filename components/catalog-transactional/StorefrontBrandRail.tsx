"use client";

import Image from "next/image";
import { LayoutGrid } from "lucide-react";
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
 * Carrusel global de marcas oficiales de Alcéntimo (logo + nombre).
 * Un clic filtra el catálogo del dropshipper.
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
        <h2 id="storefront-brand-rail-title">Marcas destacadas</h2>
        <p>Filtrá el catálogo por la marca oficial con un clic</p>
      </div>
      <ul className="storefront-brand-rail-track">
        <li>
          <button
            type="button"
            className={cn(
              "storefront-brand-card",
              activeBrand == null && "is-active",
            )}
            onClick={() => onSelectBrand(null)}
          >
            <span className="storefront-brand-card-logo" aria-hidden="true">
              <LayoutGrid className="h-6 w-6" />
            </span>
            <span className="storefront-brand-card-label">Todas</span>
          </button>
        </li>
        {brands.map((brand) => (
          <li key={brand.key}>
            <button
              type="button"
              className={cn(
                "storefront-brand-card",
                activeBrand != null &&
                  productBrandKey(activeBrand) === productBrandKey(brand.name) &&
                  "is-active",
              )}
              onClick={() => onSelectBrand(brand.name)}
            >
              <span className="storefront-brand-card-logo">
                {brand.logoUrl ? (
                  <Image
                    src={brand.logoUrl}
                    alt=""
                    width={48}
                    height={48}
                    className="h-10 w-10 object-contain"
                  />
                ) : (
                  <span className="storefront-brand-card-fallback">
                    {brand.name.slice(0, 1)}
                  </span>
                )}
              </span>
              <span className="storefront-brand-card-label">{brand.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
