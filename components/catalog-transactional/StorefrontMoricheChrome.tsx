"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ShoppingBag,
  ShoppingCart,
  UserRound,
} from "lucide-react";
import { MercadoBrandHeader } from "@/components/mercado-oculto/MercadoBrandHeader";
import { MercadoBrowseHero } from "@/components/mercado-oculto/MercadoBrowseHero";
import type { MercadoHeroCategory } from "@/components/mercado-oculto/MercadoBrowseHero";
import { buildMercadoBrandCssVars } from "@/lib/mercado-oculto/brand-css-vars";
import {
  getStoreCatalogBasePath,
  getStoreCustomerAccountPath,
} from "@/lib/store-host";
import { cn } from "@/lib/cn";
import { useCartOptional } from "@/components/catalog-transactional/CartProvider";
import { useCatalogShellNavigationOptional } from "@/components/catalog-transactional/CatalogShellNavigation";
import { useCustomerSessionOptional } from "@/components/catalog-transactional/CustomerSessionProvider";

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
 * Shell visual idéntico a Mercado Oculto: cabecera superior Moriche
 * (Pedidos / Alertas / Carrito / Cuenta), hero con Explorar + pills, y main.
 * Sin tab bar inferior Inicio|Buscar|Perfil.
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
  const customerSession = useCustomerSessionOptional();
  const pathname = usePathname();
  const brandHref = getStoreCatalogBasePath(storeSlug, { pathname });
  const accountHref = getStoreCustomerAccountPath(storeSlug, "cuenta", {
    pathname,
  });
  const brandVars = buildMercadoBrandCssVars(primaryColor);
  const lead = storeDescription?.trim() || null;
  const markText = storeName.trim().slice(0, 1) || "T";
  const itemCount = cart?.itemCount ?? 0;
  const isCustomer = Boolean(customerSession?.isCustomer);
  const onAccount =
    pathname === accountHref || pathname.startsWith(`${accountHref}/`);

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
            <Link
              href={accountHref}
              prefetch
              className={cn(
                "mercado-nav-link",
                onAccount && "mercado-nav-link-active",
              )}
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              <span className="mercado-nav-label">Pedidos</span>
            </Link>
            <button
              type="button"
              className="mercado-nav-link"
              aria-label="Notificaciones"
              onClick={() => shellNav?.openProfile()}
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              <span className="mercado-nav-label">Alertas</span>
            </button>
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
            {isCustomer ? (
              <Link
                href={accountHref}
                prefetch
                className={cn(
                  "mercado-nav-link",
                  onAccount && "mercado-nav-link-active",
                )}
                title={customerSession?.displayName ?? "Cuenta"}
              >
                <UserRound className="h-4 w-4" aria-hidden="true" />
                <span className="mercado-nav-label">Cuenta</span>
              </Link>
            ) : (
              <button
                type="button"
                className="mercado-nav-link mercado-mp-auth-link"
                onClick={() => shellNav?.openRegister("login")}
              >
                <UserRound className="h-4 w-4" aria-hidden="true" />
                <span className="mercado-nav-label">Entrar</span>
              </button>
            )}
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
