"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, Home, LayoutGrid, ShoppingBag, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { getStoreCatalogBasePath } from "@/lib/store-host";

export type CatalogTabId =
  | "inicio"
  | "armar-pc"
  | "categorias"
  | "compras"
  | "perfil";

interface CatalogTabBarProps {
  storeSlug: string;
  /** Activo automáticamente cuando el rubro de la tienda es tecnología. */
  pcBuilderEnabled?: boolean;
}

type CatalogTabSegment = "" | "armar-pc" | "categorias" | "cuenta" | "perfil";

interface CatalogTabDefinition {
  id: CatalogTabId;
  label: string;
  segment: CatalogTabSegment;
  icon: LucideIcon;
}

const BASE_TABS: CatalogTabDefinition[] = [
  { id: "inicio", label: "Inicio", segment: "", icon: Home },
  { id: "categorias", label: "Categorías", segment: "categorias", icon: LayoutGrid },
  { id: "compras", label: "Compras", segment: "cuenta", icon: ShoppingBag },
  { id: "perfil", label: "Perfil", segment: "perfil", icon: User },
];

const PC_BUILDER_TAB: CatalogTabDefinition = {
  id: "armar-pc",
  label: "Arma tu PC",
  segment: "armar-pc",
  icon: Cpu,
};

function buildTabs(pcBuilderEnabled: boolean): CatalogTabDefinition[] {
  if (!pcBuilderEnabled) return BASE_TABS;

  return [
    BASE_TABS[0],
    PC_BUILDER_TAB,
    ...BASE_TABS.slice(1),
  ];
}

function resolveActiveTab(
  pathname: string,
  storeSlug: string,
  pcBuilderEnabled: boolean,
): CatalogTabId {
  const base = getStoreCatalogBasePath(storeSlug);

  if (pathname === base || pathname === `${base}/`) {
    return "inicio";
  }

  if (pcBuilderEnabled && pathname.startsWith(`${base}/armar-pc`)) {
    return "armar-pc";
  }

  if (pathname.startsWith(`${base}/categorias`)) return "categorias";
  if (pathname.startsWith(`${base}/cuenta`)) return "compras";
  if (pathname.startsWith(`${base}/perfil`)) return "perfil";

  if (base === "/") {
    if (pathname === "/" || pathname === "") return "inicio";
    if (pcBuilderEnabled && pathname.startsWith("/armar-pc")) return "armar-pc";
    if (pathname.startsWith("/categorias")) return "categorias";
    if (pathname.startsWith("/cuenta")) return "compras";
    if (pathname.startsWith("/perfil")) return "perfil";
  }

  return "inicio";
}

export function CatalogTabBar({
  storeSlug,
  pcBuilderEnabled = false,
}: CatalogTabBarProps) {
  const pathname = usePathname();
  const activeTab = resolveActiveTab(pathname, storeSlug, pcBuilderEnabled);
  const base = getStoreCatalogBasePath(storeSlug);
  const tabs = buildTabs(pcBuilderEnabled);

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
        {tabs.map(({ id, label, segment, icon: Icon }) => {
          const href = segment ? `${base}/${segment}`.replace("//", "/") : base;
          const isActive = activeTab === id;

          return (
            <Link
              key={id}
              href={href}
              className={cn("catalog-tab-item", isActive && "catalog-tab-item-active")}
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
