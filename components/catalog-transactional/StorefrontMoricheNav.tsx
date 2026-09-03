"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogIn, LogOut, Package, ShoppingBag, UserPlus, UserRound } from "lucide-react";
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
  /** Reservado para cabeceras estrechas; la barra usa solo íconos. */
  compact?: boolean;
}

const ICON_STROKE = 1.5;

/**
 * Acciones de la cabecera: carrito + menú de cuenta.
 * Pedidos y registro viven dentro del desplegable de perfil.
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

  function openAuth(mode: "login" | "register") {
    if (shellNav) {
      shellNav.openRegister(mode);
      return;
    }
    router.push(buildCustomerRegisterPath(storeSlug, catalogHref));
  }

  async function handleSignOut() {
    await customerSession?.signOut();
    router.push(catalogHref);
  }

  return (
    <>
      <button
        type="button"
        className={cn(
          "mercado-nav-link mercado-mp-cart-link storefront-mp-icon-btn",
          shellNav?.cartActive && "mercado-nav-link-active",
        )}
        onClick={() => shellNav?.openCart()}
        aria-label={
          itemCount > 0
            ? `Carrito, ${itemCount} productos`
            : "Carrito de compras"
        }
      >
        <ShoppingBag
          className="h-5 w-5"
          strokeWidth={ICON_STROKE}
          aria-hidden="true"
        />
        {itemCount > 0 ? (
          <span className="mercado-mp-cart-badge">
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        ) : null}
      </button>

      <DropdownMenu
        align="end"
        className="storefront-mp-account-menu"
        menuClassName="storefront-mp-account-dropdown min-w-[13.5rem] p-1"
        trigger={
          <button
            type="button"
            className={cn(
              "mercado-nav-link storefront-mp-icon-btn",
              onAccount && "mercado-nav-link-active",
            )}
            aria-haspopup="menu"
            aria-label={isCustomer ? "Mi cuenta" : "Acceder a tu cuenta"}
            title={
              isCustomer
                ? (customerSession?.displayName ?? "Mi cuenta")
                : "Acceder"
            }
          >
            <UserRound
              className="h-5 w-5"
              strokeWidth={ICON_STROKE}
              aria-hidden="true"
            />
          </button>
        }
      >
        {(close) =>
          isCustomer ? (
            <>
              <p className="storefront-mp-account-dropdown-label">
                {customerSession?.displayName?.trim() || "Mi cuenta"}
              </p>
              <Link
                href={profileHref}
                prefetch
                role="menuitem"
                onClick={close}
                className="storefront-mp-account-item"
              >
                <UserRound
                  className="h-4 w-4"
                  strokeWidth={ICON_STROKE}
                  aria-hidden="true"
                />
                Mi perfil
              </Link>
              <Link
                href={accountHref}
                prefetch
                role="menuitem"
                onClick={close}
                className="storefront-mp-account-item"
              >
                <Package
                  className="h-4 w-4"
                  strokeWidth={ICON_STROKE}
                  aria-hidden="true"
                />
                Pedidos
              </Link>
              <DropdownMenuItem
                destructive
                disabled={customerSession?.signOutPending}
                onClick={() => {
                  close();
                  void handleSignOut();
                }}
              >
                <LogOut
                  className="h-4 w-4"
                  strokeWidth={ICON_STROKE}
                  aria-hidden="true"
                />
                Cerrar sesión
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <p className="storefront-mp-account-dropdown-label">Acceder</p>
              <DropdownMenuItem
                onClick={() => {
                  close();
                  openAuth("login");
                }}
              >
                <LogIn
                  className="h-4 w-4"
                  strokeWidth={ICON_STROKE}
                  aria-hidden="true"
                />
                Entrar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  close();
                  openAuth("register");
                }}
              >
                <UserPlus
                  className="h-4 w-4"
                  strokeWidth={ICON_STROKE}
                  aria-hidden="true"
                />
                Crea tu cuenta
              </DropdownMenuItem>
            </>
          )
        }
      </DropdownMenu>
    </>
  );
}
