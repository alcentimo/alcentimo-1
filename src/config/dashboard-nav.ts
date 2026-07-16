import {
  BarChart3,
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  Package,
  RefreshCw,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: (pathname: string) => boolean;
}

export interface DashboardNavSection {
  id: string;
  label: string;
  items: DashboardNavItem[];
}

export const DASHBOARD_NAV_SECTIONS: DashboardNavSection[] = [
  {
    id: "operations",
    label: "Operaciones",
    items: [
      {
        href: "/dashboard",
        label: "Inicio",
        icon: LayoutDashboard,
        match: (pathname) => pathname === "/dashboard",
      },
      {
        href: "/dashboard/inventario",
        label: "Productos",
        icon: Package,
        match: (pathname) =>
          pathname.startsWith("/dashboard/inventario") ||
          pathname.startsWith("/dashboard/productos"),
      },
      {
        href: "/dashboard/pedidos",
        label: "Órdenes",
        icon: ClipboardList,
        match: (pathname) => pathname.startsWith("/dashboard/pedidos"),
      },
    ],
  },
  {
    id: "customers",
    label: "Gestión de Clientes",
    items: [
      {
        href: "/dashboard/mensajes",
        label: "Clientes",
        icon: Users,
        match: (pathname) => pathname.startsWith("/dashboard/mensajes"),
      },
      {
        href: "/dashboard/referidos",
        label: "Referidos",
        icon: UserPlus,
        match: (pathname) => pathname.startsWith("/dashboard/referidos"),
      },
    ],
  },
  {
    id: "intelligence",
    label: "Inteligencia de Negocio",
    items: [
      {
        href: "/dashboard/analiticas",
        label: "Analíticas",
        icon: BarChart3,
        match: (pathname) => pathname.startsWith("/dashboard/analiticas"),
      },
      {
        href: "/dashboard/ventas",
        label: "Reportes",
        icon: FileBarChart,
        match: (pathname) => pathname.startsWith("/dashboard/ventas"),
      },
    ],
  },
  {
    id: "configuration",
    label: "Configuración",
    items: [
      {
        href: "/dashboard/tasas",
        label: "Tasas del día",
        icon: RefreshCw,
        match: (pathname) => pathname.startsWith("/dashboard/tasas"),
      },
      {
        href: "/dashboard/planes",
        label: "Equipo",
        icon: Users,
        match: (pathname) =>
          pathname.startsWith("/dashboard/planes") ||
          pathname.startsWith("/dashboard/ajustes"),
      },
    ],
  },
];

export function isDashboardNavItemActive(
  pathname: string,
  item: DashboardNavItem,
): boolean {
  return item.match?.(pathname) ?? pathname === item.href;
}
