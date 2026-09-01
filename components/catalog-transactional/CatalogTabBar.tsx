"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { Cpu, Home, Search, ShoppingCart, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { getStoreCatalogBasePath } from "@/lib/store-host";
import { useCatalogShellNavigationOptional } from "@/components/catalog-transactional/CatalogShellNavigation";
import { useCartOptional } from "@/components/catalog-transactional/CartProvider";

export type CatalogTabId =
  | "inicio"
  | "buscar"
  | "armar-pc"
  | "carrito"
  | "perfil";

interface CatalogTabBarProps {
  storeSlug: string;
  /** Activo cuando la tienda es tecnología y tiene habilitado Arma tu PC. */
  pcBuilderEnabled?: boolean;
}

type CatalogTabSegment = "" | "armar-pc";

interface CatalogTabDefinition {
  id: CatalogTabId;
  label: string;
  segment?: CatalogTabSegment;
  icon: LucideIcon;
  action?: "search" | "profile" | "cart";
}

const BASE_TABS: CatalogTabDefinition[] = [
  { id: "inicio", label: "Inicio", segment: "", icon: Home },
  { id: "buscar", label: "Buscar", icon: Search, action: "search" },
  { id: "carrito", label: "Carrito", icon: ShoppingCart, action: "cart" },
  { id: "perfil", label: "Cuenta", icon: User, action: "profile" },
];

const PC_BUILDER_TAB: CatalogTabDefinition = {
  id: "armar-pc",
  label: "Arma PC",
  segment: "armar-pc",
  icon: Cpu,
};

function buildTabs(pcBuilderEnabled: boolean): CatalogTabDefinition[] {
  if (!pcBuilderEnabled) return BASE_TABS;
  return [BASE_TABS[0], PC_BUILDER_TAB, BASE_TABS[2], BASE_TABS[3]];
}

function isCatalogHomePath(pathname: string, base: string): boolean {
  if (pathname === base || pathname === `${base}/`) return true;
  if (pathname.startsWith(`${base}/categorias`)) return true;
  if (base === "/") {
    return (
      pathname === "/" ||
      pathname === "" ||
      pathname.startsWith("/categorias")
    );
  }
  return false;
}

function resolveActiveTab(
  pathname: string,
  storeSlug: string,
  pcBuilderEnabled: boolean,
  searchActive: boolean,
  profileOpen: boolean,
  cartActive: boolean,
): CatalogTabId {
  if (cartActive) return "carrito";
  if (profileOpen) return "perfil";
  if (searchActive) return "buscar";

  const base = getStoreCatalogBasePath(storeSlug, { pathname });

  if (pcBuilderEnabled && pathname.startsWith(`${base}/armar-pc`)) {
    return "armar-pc";
  }

  if (base === "/" && pcBuilderEnabled && pathname.startsWith("/armar-pc")) {
    return "armar-pc";
  }

  if (isCatalogHomePath(pathname, base)) {
    return "inicio";
  }

  return "inicio";
}

function buildTabHref(
  base: string,
  segment: CatalogTabSegment | undefined,
): string {
  if (!segment) return base;
  return `${base}/${segment}`.replace("//", "/");
}

function buildSearchHref(base: string): string {
  return base === "/" ? "/?buscar=1" : `${base}?buscar=1`;
}

export function CatalogTabBar({
  storeSlug,
  pcBuilderEnabled = false,
}: CatalogTabBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const shellNav = useCatalogShellNavigationOptional();
  const cart = useCartOptional();
  const itemCount = cart?.itemCount ?? 0;
  const searchActive = shellNav?.searchActive ?? false;
  const profileOpen = shellNav?.profileOpen ?? false;
  const cartActive = shellNav?.cartActive ?? false;
  const activeTab = resolveActiveTab(
    pathname,
    storeSlug,
    pcBuilderEnabled,
    searchActive,
    profileOpen,
    cartActive,
  );
  const base = getStoreCatalogBasePath(storeSlug, { pathname });
  const tabs = buildTabs(pcBuilderEnabled);

  function handleInicioClick(event: MouseEvent<HTMLAnchorElement>) {
    const href = buildTabHref(base, "");
    shellNav?.clearSearchActive();
    shellNav?.closeProfile();
    shellNav?.closeCart();

    if (pathname === href || pathname === `${href}/`) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleSearchClick() {
    shellNav?.closeProfile();
    shellNav?.closeCart();

    if (isCatalogHomePath(pathname, base)) {
      if (shellNav) {
        shellNav.focusSearch();
        return;
      }

      const input = document.getElementById(
        "catalog-browse-search",
      ) as HTMLInputElement | null;
      input?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => input?.focus({ preventScroll: true }), 180);
      return;
    }

    router.push(buildSearchHref(base));
  }

  return (
    <nav
      className="catalog-tab-bar catalog-tab-bar--marketplace safe-area-bottom"
      aria-label="Navegación del catálogo"
    >
      <div
        className={cn(
          "catalog-tab-bar-inner",
          pcBuilderEnabled && "catalog-tab-bar-inner--pc-builder",
        )}
      >
        {tabs.map(({ id, label, segment, icon: Icon, action }) => {
          const isActive = activeTab === id;

          if (action === "search") {
            return (
              <button
                key={id}
                type="button"
                onClick={handleSearchClick}
                className={cn(
                  "catalog-tab-item",
                  isActive && "catalog-tab-item-active",
                )}
                aria-current={isActive ? "page" : undefined}
                aria-label="Buscar en el catálogo"
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          }

          if (action === "cart") {
            return (
              <button
                key={id}
                type="button"
                onClick={() => shellNav?.openCart()}
                className={cn(
                  "catalog-tab-item catalog-tab-item--cart",
                  isActive && "catalog-tab-item-active",
                )}
                aria-current={isActive ? "page" : undefined}
                aria-label={
                  itemCount > 0
                    ? `Carrito, ${itemCount} artículos`
                    : "Carrito de compras"
                }
              >
                <span className="catalog-tab-icon-wrap">
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {itemCount > 0 ? (
                    <span className="catalog-tab-cart-badge">{itemCount}</span>
                  ) : null}
                </span>
                <span>{label}</span>
              </button>
            );
          }

          if (action === "profile") {
            return (
              <button
                key={id}
                type="button"
                onClick={() => shellNav?.openProfile()}
                className={cn(
                  "catalog-tab-item",
                  isActive && "catalog-tab-item-active",
                )}
                aria-current={isActive ? "page" : undefined}
                aria-label="Ver información de la tienda"
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          }

          const href = buildTabHref(base, segment);

          return (
            <Link
              key={id}
              href={href}
              onClick={
                id === "inicio"
                  ? handleInicioClick
                  : () => {
                      shellNav?.clearSearchActive();
                      shellNav?.closeProfile();
                      shellNav?.closeCart();
                    }
              }
              className={cn(
                "catalog-tab-item",
                isActive && "catalog-tab-item-active",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
