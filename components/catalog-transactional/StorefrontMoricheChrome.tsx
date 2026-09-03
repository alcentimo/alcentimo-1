"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { MercadoBrandHeader } from "@/components/mercado-oculto/MercadoBrandHeader";
import { StorefrontMoricheNav } from "@/components/catalog-transactional/StorefrontMoricheNav";
import { StorefrontMarketplaceSearch } from "@/components/catalog-transactional/StorefrontMarketplaceSearch";
import { StorefrontCategoryRail } from "@/components/catalog-transactional/StorefrontCategoryRail";
import { StorefrontBrandRail } from "@/components/catalog-transactional/StorefrontBrandRail";
import { buildMercadoBrandCssVars } from "@/lib/mercado-oculto/brand-css-vars";
import { getStoreCatalogBasePath } from "@/lib/store-host";
import type { CatalogCategoryOption } from "@/lib/catalog/extract-categories";
import type { CatalogBrandOption } from "@/lib/catalog/product-brand";
import { StorefrontHeroStage } from "@/components/catalog-transactional/StorefrontHeroStage";
import { cn } from "@/lib/cn";

export interface StorefrontMoricheChromeProps {
  storeSlug: string;
  storeName: string;
  storeDescription?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  eyebrow?: string;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit?: () => void;
  categories: CatalogCategoryOption[];
  activeCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  pending?: boolean;
  brands?: CatalogBrandOption[];
  activeBrand?: string | null;
  onSelectBrand?: (brand: string | null) => void;
  /** Banner / promo debajo de la cabecera (personalización de tienda). */
  banner?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Cabecera + categorías fijas al hacer scroll (ficha de producto). */
  pinNavigation?: boolean;
  /** Ficha de producto: sin rieles de categoría para evitar saltos. */
  productChrome?: boolean;
}

/**
 * Shell marketplace único de las tiendas públicas de dropshippers:
 * cabecera fija (logo + buscador + Carrito / Pedidos / Cuenta),
 * banner, categorías visuales y listado. Color, logo y banner vienen
 * de la configuración de cada tienda.
 */
export function StorefrontMoricheChrome({
  storeSlug,
  storeName,
  storeDescription = null,
  logoUrl = null,
  primaryColor = null,
  eyebrow = "Catálogo",
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
  categories,
  activeCategoryId,
  onSelectCategory,
  pending = false,
  brands = [],
  activeBrand = null,
  onSelectBrand,
  banner = null,
  children,
  className,
  style,
  pinNavigation = false,
  productChrome = false,
}: StorefrontMoricheChromeProps) {
  const pathname = usePathname();
  const brandHref = getStoreCatalogBasePath(storeSlug, { pathname });
  const brandVars = buildMercadoBrandCssVars(primaryColor);
  const markText = storeName.trim().slice(0, 1) || "T";
  const lead = storeDescription?.trim() || null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#storefront-categorias") return;
    document
      .getElementById("storefront-categorias")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [pathname, categories.length]);

  return (
    <div
      className={cn(
        "mercado-shell storefront-moriche-shell storefront-mp-shell",
        productChrome && "storefront-mp-shell--product",
        className,
      )}
      style={{ ...brandVars, ...style }}
    >
      <div
        className={cn(pinNavigation && "storefront-mp-pin")}
      >
        <MercadoBrandHeader
          brandHref={brandHref}
          brandTitle={storeName}
          brandKicker={eyebrow}
          brandMarkText={markText}
          logoUrl={logoUrl}
          search={
            <StorefrontMarketplaceSearch
              storeName={storeName}
              value={searchQuery}
              onChange={onSearchQueryChange}
              onSubmit={onSearchSubmit}
              pending={pending}
            />
          }
          nav={<StorefrontMoricheNav storeSlug={storeSlug} />}
          className="storefront-mp-header"
        />

        {productChrome ? null : banner ? (
          <StorefrontHeroStage>{banner}</StorefrontHeroStage>
        ) : null}

        {productChrome || !lead ? null : (
          <p className="storefront-mp-lead">{lead}</p>
        )}

        {productChrome ? null : (
          <StorefrontCategoryRail
            categories={categories}
            activeCategoryId={activeCategoryId}
            onSelectCategory={onSelectCategory}
          />
        )}

        {productChrome || !onSelectBrand ? null : (
          <StorefrontBrandRail
            brands={brands}
            activeBrand={activeBrand}
            onSelectBrand={onSelectBrand}
          />
        )}
      </div>

      <main className="mercado-main mercado-mp-main">{children}</main>
    </div>
  );
}
