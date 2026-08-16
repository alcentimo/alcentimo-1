"use client";

import type { CSSProperties, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MercadoBrandHeader } from "@/components/mercado-oculto/MercadoBrandHeader";
import { MercadoBrowseHero } from "@/components/mercado-oculto/MercadoBrowseHero";
import type { MercadoHeroCategory } from "@/components/mercado-oculto/MercadoBrowseHero";
import { StorefrontMoricheNav } from "@/components/catalog-transactional/StorefrontMoricheNav";
import { buildMercadoBrandCssVars } from "@/lib/mercado-oculto/brand-css-vars";
import { getStoreCatalogBasePath } from "@/lib/store-host";
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
  categories: MercadoHeroCategory[];
  activeCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  pending?: boolean;
  /** Banner / promo debajo del hero (personalización de tienda). */
  banner?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Shell visual Moriche del catálogo público:
 * cabecera (Pedidos / Carrito / Cuenta) + hero Explorar + pills + main.
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
  categories,
  activeCategoryId,
  onSelectCategory,
  pending = false,
  banner = null,
  children,
  className,
  style,
}: StorefrontMoricheChromeProps) {
  const pathname = usePathname();
  const brandHref = getStoreCatalogBasePath(storeSlug, { pathname });
  const brandVars = buildMercadoBrandCssVars(primaryColor);
  const lead = storeDescription?.trim() || null;
  const markText = storeName.trim().slice(0, 1) || "T";

  return (
    <div
      className={cn("mercado-shell storefront-moriche-shell", className)}
      style={{ ...brandVars, ...style }}
    >
      <MercadoBrandHeader
        brandHref={brandHref}
        brandTitle={storeName}
        brandKicker={eyebrow}
        brandMarkText={markText}
        logoUrl={logoUrl}
        nav={<StorefrontMoricheNav storeSlug={storeSlug} />}
      />

      <MercadoBrowseHero
        kicker={eyebrow}
        title={
          <>
            La vitrina de{" "}
            <span className="mercado-hero-title-accent">{storeName}</span>
          </>
        }
        titleId={`store-hero-${storeSlug}`}
        lead={lead}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        onSearchSubmit={() => {
          document
            .getElementById("mercado-colecciones")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        searchAriaLabel={`Buscar en ${storeName}`}
        pending={pending}
        categories={categories}
        activeCategoryId={activeCategoryId}
        onSelectCategory={onSelectCategory}
        allLabel="Toda la vitrina"
      />

      {banner}

      <main className="mercado-main mercado-mp-main">{children}</main>
    </div>
  );
}
