"use client";

import type { CSSProperties, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, ShoppingCart, Sparkles } from "lucide-react";
import { MercadoBrandHeader } from "@/components/mercado-oculto/MercadoBrandHeader";
import { MercadoBrowseHero } from "@/components/mercado-oculto/MercadoBrowseHero";
import type { MercadoHeroCategory } from "@/components/mercado-oculto/MercadoBrowseHero";
import { buildMercadoBrandCssVars } from "@/lib/mercado-oculto/brand-css-vars";
import { getStoreCatalogBasePath } from "@/lib/store-host";
import { cn } from "@/lib/cn";
import { useCartOptional } from "@/components/catalog-transactional/CartProvider";
import { useCatalogShellNavigationOptional } from "@/components/catalog-transactional/CatalogShellNavigation";

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
 * Shell visual idéntico a Mercado Oculto, con branding de la tienda
 * (logo, nombre, color principal) y hooks de carrito/asistencia del catálogo.
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
  const cart = useCartOptional();
  const shellNav = useCatalogShellNavigationOptional();
  const pathname = usePathname();
  const brandHref = getStoreCatalogBasePath(storeSlug, { pathname });
  const brandVars = buildMercadoBrandCssVars(primaryColor);
  const lead = storeDescription?.trim() || null;
  const markText = storeName.trim().slice(0, 1) || "T";
  const itemCount = cart?.itemCount ?? 0;

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
        nav={
          <>
            {shellNav?.assistantAvailable ? (
              <button
                type="button"
                className="mercado-nav-link"
                onClick={() => shellNav.openAssistant()}
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span className="mercado-nav-label">Ayuda</span>
              </button>
            ) : null}
            {shellNav?.whatsAppAvailable ? (
              <button
                type="button"
                className="mercado-nav-link"
                onClick={() => shellNav.openWhatsAppChat()}
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <span className="mercado-nav-label">WhatsApp</span>
              </button>
            ) : null}
            <button
              type="button"
              className={cn(
                "mercado-nav-link mercado-mp-cart-link",
                shellNav?.cartActive && "mercado-nav-link-active",
              )}
              onClick={() => shellNav?.openCart()}
              aria-label={
                itemCount > 0
                  ? `Carrito, ${itemCount} artículos`
                  : "Carrito de compras"
              }
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              <span className="mercado-nav-label">Carrito</span>
              {itemCount > 0 ? (
                <span className="mercado-mp-cart-badge">{itemCount}</span>
              ) : null}
            </button>
          </>
        }
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
          /* La búsqueda es en vivo; el submit solo enfoca exploración. */
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
