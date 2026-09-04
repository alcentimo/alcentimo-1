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
import {
  DropdownMenu,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface StorefrontMoricheNavProps {
  storeSlug: string;
  /** Compact labels for narrow headers on account pages. */
  compact?: boolean;
}

/**
 * Accesos superiores de la plantilla marketplace:
 * carrito + menú de cuenta (Pedidos, Categorías, autenticación).
 */
export function StorefrontMoricheNav({
  storeSlug,
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
        className={cn(
          "mercado-nav-link mercado-nav-icon-btn mercado-mp-cart-link",
          shellNav?.cartActive && "mercado-nav-link-active",
        )}
        onClick={() => shellNav?.openCart()}
        aria-label={
          itemCount > 0
            ? `Carrito, ${itemCount} artículos`
            : "Carrito de compras"
        }
      >
        <ShoppingCart className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
        {itemCount > 0 ? (
          <span className="mercado-mp-cart-badge">
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        ) : null}
      </button>

      <DropdownMenu
        align="end"
        className="storefront-mp-account-menu"
        menuClassName="storefront-mp-account-dropdown"
        trigger={
          <button
            type="button"
            className={cn(
              "mercado-nav-link mercado-nav-icon-btn",
              onAccount && "mercado-nav-link-active",
            )}
            aria-haspopup="menu"
            aria-label={
              isCustomer
                ? customerSession?.displayName
                  ? `Cuenta de ${customerSession.displayName}`
                  : "Mi cuenta"
                : "Cuenta"
            }
          >
            <UserRound className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
          </button>
        }
      >
        {(close) => (
          <>
            <DropdownMenuItem
              onClick={() => {
                close();
                goToCategories();
              }}
            >
              <LayoutGrid className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
              Categorías
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                close();
                goToOrders();
              }}
            >
              <ShoppingBag className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
              Pedidos
            </DropdownMenuItem>
            {isCustomer ? (
              <Link
                href={profileHref}
                prefetch
                role="menuitem"
                onClick={close}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
              >
                <UserRound className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
                Mi cuenta
              </Link>
            ) : (
              <>
                <DropdownMenuItem
                  onClick={() => {
                    close();
                    shellNav?.openRegister("login");
                  }}
                >
                  <UserRound className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
                  Entrar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    close();
                    shellNav?.openRegister("register");
                  }}
                >
                  <UserPlus className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
                  Crear cuenta
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
      </DropdownMenu>
    </>
  );
}
