"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  ShoppingBag,
  ShoppingCart,
  UserPlus,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { buildCustomerRegisterPath } from "@/lib/customers/middleware-access";
import {
  getStoreCatalogBasePath,
  getStoreCustomerAccountPath,
} from "@/lib/store-host";
import { useCartOptional } from "@/components/catalog-transactional/CartProvider";
import { useCatalogShellNavigationOptional } from "@/components/catalog-transactional/CatalogShellNavigation";
import { useCustomerSessionOptional } from "@/components/catalog-transactional/CustomerSessionProvider";

interface StorefrontMoricheNavProps {
  storeSlug: string;
  /** Compact labels for narrow headers on account pages. */
  compact?: boolean;
}

/**
 * Accesos superiores de la plantilla marketplace:
 * Pedidos · Carrito · Cuenta | Entrar + Crear cuenta
 */
export function StorefrontMoricheNav({
  storeSlug,
  compact = false,
}: StorefrontMoricheNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const cart = useCartOptional();
  const shellNav = useCatalogShellNavigationOptional();
  const customerSession = useCustomerSessionOptional();

  const catalogHref = getStoreCatalogBasePath(storeSlug, { pathname });
  const accountHref = getStoreCustomerAccountPath(storeSlug, "cuenta", {
    pathname,
  });
  const profileHref = getStoreCustomerAccountPath(storeSlug, "perfil", {
    pathname,
  });
  const itemCount = cart?.itemCount ?? 0;
  const isCustomer = Boolean(
    customerSession?.isAuthenticated && customerSession?.isCustomer,
  );
  const onAccount =
    pathname === accountHref ||
    pathname.startsWith(`${accountHref}/`) ||
    pathname === profileHref ||
    pathname.startsWith(`${profileHref}/`);

  function goToCategories() {
    const target = document.getElementById("storefront-categorias");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    router.push(`${catalogHref}#storefront-categorias`);
  }

  function goToOrders() {
    if (isCustomer) {
      router.push(accountHref);
      return;
    }
    if (shellNav) {
      shellNav.openRegister("login");
      return;
    }
    router.push(buildCustomerRegisterPath(storeSlug, accountHref));
  }

  return (
    <>
      <button
        type="button"
        className="mercado-nav-link"
        onClick={goToCategories}
      >
        <LayoutGrid className="h-4 w-4" aria-hidden="true" />
        <span className="mercado-nav-label">Categorías</span>
      </button>

      <button
        type="button"
        className={cn("mercado-nav-link", onAccount && "mercado-nav-link-active")}
        onClick={goToOrders}
      >
        <ShoppingBag className="h-4 w-4" aria-hidden="true" />
        <span className="mercado-nav-label">Pedidos</span>
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
          href={profileHref}
          prefetch
          className={cn(
            "mercado-nav-link",
            (pathname === profileHref ||
              pathname.startsWith(`${profileHref}/`)) &&
              "mercado-nav-link-active",
          )}
          title={customerSession?.displayName ?? "Cuenta"}
        >
          <UserRound className="h-4 w-4" aria-hidden="true" />
          <span className="mercado-nav-label">
            {compact ? "Cuenta" : "Mi cuenta"}
          </span>
        </Link>
      ) : (
        <>
          <button
            type="button"
            className="mercado-nav-link mercado-mp-auth-link"
            onClick={() => shellNav?.openRegister("login")}
          >
            <UserRound className="h-4 w-4" aria-hidden="true" />
            <span className="mercado-nav-label">Entrar</span>
          </button>
          <button
            type="button"
            className="mercado-nav-link"
            onClick={() => shellNav?.openRegister("register")}
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            <span className="mercado-nav-label">
              {compact ? "Crear" : "Crea tu cuenta"}
            </span>
          </button>
        </>
      )}
    </>
  );
}
