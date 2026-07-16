import {
  BarChart3,
  ClipboardList,
  Store,
  type LucideIcon,
} from "lucide-react";

export interface DashboardNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  match?: (pathname: string) => boolean;
}

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  {
    href: "/dashboard/catalogo",
    label: "Catálogo",
    description: "Inventario y ajustes de tu tienda",
    icon: Store,
    match: (pathname) =>
      pathname.startsWith("/dashboard/catalogo") ||
      pathname.startsWith("/dashboard/inventario") ||
      pathname.startsWith("/dashboard/ajustes") ||
      pathname.startsWith("/dashboard/productos") ||
      pathname === "/dashboard",
  },
  {
    href: "/dashboard/pedidos",
    label: "Órdenes",
    description: "Gestión de ventas y pedidos",
    icon: ClipboardList,
    match: (pathname) => pathname.startsWith("/dashboard/pedidos"),
  },
  {
    href: "/dashboard/analiticas",
    label: "Analíticas",
    description: "Métricas de rendimiento",
    icon: BarChart3,
    match: (pathname) => pathname.startsWith("/dashboard/analiticas"),
  },
];

/** @deprecated Usar DASHBOARD_NAV_ITEMS */
export const DASHBOARD_NAV_SECTIONS = [
  {
    id: "main",
    label: "",
    items: DASHBOARD_NAV_ITEMS,
  },
];

export function isDashboardNavItemActive(
  pathname: string,
  item: DashboardNavItem,
): boolean {
  return item.match?.(pathname) ?? pathname === item.href;
}
