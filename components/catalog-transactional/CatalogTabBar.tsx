"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/cn";
import { getStoreCatalogBasePath } from "@/lib/store-host";

export type CatalogTabId = "inicio" | "categorias" | "compras" | "perfil";

interface CatalogTabBarProps {
  storeSlug: string;
}

const TABS: {
  id: CatalogTabId;
  label: string;
  segment: "" | "categorias" | "cuenta" | "perfil";
  icon: typeof Home;
}[] = [
  { id: "inicio", label: "Inicio", segment: "", icon: Home },
  { id: "categorias", label: "Categorías", segment: "categorias", icon: LayoutGrid },
  { id: "compras", label: "Compras", segment: "cuenta", icon: ShoppingBag },
  { id: "perfil", label: "Perfil", segment: "perfil", icon: User },
];

function resolveActiveTab(pathname: string, storeSlug: string): CatalogTabId {
  const base = getStoreCatalogBasePath(storeSlug);

  if (pathname === base || pathname === `${base}/`) {
    return "inicio";
  }

  if (pathname.startsWith(`${base}/categorias`)) return "categorias";
  if (pathname.startsWith(`${base}/cuenta`)) return "compras";
  if (pathname.startsWith(`${base}/perfil`)) return "perfil";

  if (base === "/") {
    if (pathname === "/" || pathname === "") return "inicio";
    if (pathname.startsWith("/categorias")) return "categorias";
    if (pathname.startsWith("/cuenta")) return "compras";
    if (pathname.startsWith("/perfil")) return "perfil";
  }

  return "inicio";
}

export function CatalogTabBar({ storeSlug }: CatalogTabBarProps) {
  const pathname = usePathname();
  const activeTab = resolveActiveTab(pathname, storeSlug);
  const base = getStoreCatalogBasePath(storeSlug);

  return (
    <nav
      className="catalog-tab-bar safe-area-bottom"
      aria-label="Navegación del catálogo"
    >
      <div className="catalog-tab-bar-inner">
        {TABS.map(({ id, label, segment, icon: Icon }) => {
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
