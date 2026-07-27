"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { Cpu, Home, LayoutGrid, ShoppingBag, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { getStoreCatalogBasePath } from "@/lib/store-host";
import { useCatalogShellNavigationOptional } from "@/components/catalog-transactional/CatalogShellNavigation";

export type CatalogTabId =
  | "inicio"
  | "armar-pc"
  | "categorias"
  | "compras"
  | "perfil";

interface CatalogTabBarProps {
  storeSlug: string;
  /** Activo cuando la tienda es tecnología y tiene habilitado Arma tu PC. */
  pcBuilderEnabled?: boolean;
}

type CatalogTabSegment = "" | "armar-pc" | "categorias";

interface CatalogTabDefinition {
  id: CatalogTabId;
  label: string;
  segment?: CatalogTabSegment;
  icon: LucideIcon;
  action?: "cart" | "profile";
}

const BASE_TABS: CatalogTabDefinition[] = [
  { id: "inicio", label: "Inicio", segment: "", icon: Home },
  {
    id: "categorias",
    label: "Categorías",
    segment: "categorias",
    icon: LayoutGrid,
  },
  { id: "compras", label: "Compras", icon: ShoppingBag, action: "cart" },
  { id: "perfil", label: "Perfil", icon: User, action: "profile" },
];

const PC_BUILDER_TAB: CatalogTabDefinition = {
  id: "armar-pc",
  label: "Arma tu PC",
  segment: "armar-pc",
  icon: Cpu,
};

function buildTabs(pcBuilderEnabled: boolean): CatalogTabDefinition[] {
  if (!pcBuilderEnabled) return BASE_TABS;

  return [BASE_TABS[0], PC_BUILDER_TAB, ...BASE_TABS.slice(1)];
}

function resolveActiveTab(
  pathname: string,
  storeSlug: string,
  pcBuilderEnabled: boolean,
  cartActive: boolean,
  profileOpen: boolean,
): CatalogTabId {
  if (cartActive) return "compras";
  if (profileOpen) return "perfil";

  const base = getStoreCatalogBasePath(storeSlug);

  if (pathname === base || pathname === `${base}/`) {
    return "inicio";
  }

  if (pcBuilderEnabled && pathname.startsWith(`${base}/armar-pc`)) {
    return "armar-pc";
  }

  if (pathname.startsWith(`${base}/categorias`)) return "categorias";

  if (base === "/") {
    if (pathname === "/" || pathname === "") return "inicio";
    if (pcBuilderEnabled && pathname.startsWith("/armar-pc")) return "armar-pc";
    if (pathname.startsWith("/categorias")) return "categorias";
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

export function CatalogTabBar({
  storeSlug,
  pcBuilderEnabled = false,
}: CatalogTabBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const shellNav = useCatalogShellNavigationOptional();
  const cartActive = shellNav?.cartActive ?? false;
  const profileOpen = shellNav?.profileOpen ?? false;
  const activeTab = resolveActiveTab(
    pathname,
    storeSlug,
    pcBuilderEnabled,
    cartActive,
    profileOpen,
  );
  const base = getStoreCatalogBasePath(storeSlug);
  const tabs = buildTabs(pcBuilderEnabled);

  function handleInicioClick(event: MouseEvent<HTMLAnchorElement>) {
    const href = buildTabHref(base, "");
    if (pathname === href || pathname === `${href}/`) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      shellNav?.closeProfile();
      shellNav?.closeCart();
    }
  }

  return (
    <nav
      className="catalog-tab-bar safe-area-bottom"
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

          if (action === "cart") {
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (shellNav) {
                    shellNav.openCart();
                    return;
                  }
                  router.push(buildTabHref(base, undefined) + "?carrito=1");
                }}
                className={cn(
                  "catalog-tab-item",
                  isActive && "catalog-tab-item-active",
                )}
                aria-current={isActive ? "page" : undefined}
                aria-label="Abrir carrito de compras"
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
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
