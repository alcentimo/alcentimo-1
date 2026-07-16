import {
  BarChart3,
  ClipboardList,
  FileSpreadsheet,
  LayoutDashboard,
  Package,
  RefreshCw,
  UserCog,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface DashboardNavItem {
  href: string;
  label: string;
  description: string;
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
        description: "Dashboard principal",
        icon: LayoutDashboard,
        match: (pathname) => pathname === "/dashboard",
      },
      {
        href: "/dashboard/inventario",
        label: "Productos",
        description: "Gestión de inventario",
        icon: Package,
        match: (pathname) =>
          pathname.startsWith("/dashboard/inventario") ||
          pathname.startsWith("/dashboard/productos"),
      },
      {
        href: "/dashboard/pedidos",
        label: "Órdenes",
        description: "Gestión de ventas y pedidos",
        icon: ClipboardList,
        match: (pathname) => pathname.startsWith("/dashboard/pedidos"),
      },
    ],
  },
  {
    id: "customers",
    label: "Clientes y Comunidad",
    items: [
      {
        href: "/dashboard/mensajes",
        label: "Clientes",
        description: "Lista y perfil de compradores",
        icon: Users,
        match: (pathname) => pathname.startsWith("/dashboard/mensajes"),
      },
      {
        href: "/dashboard/referidos",
        label: "Referidos",
        description: "Programa de referidos",
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
        description: "Métricas de rendimiento",
        icon: BarChart3,
        match: (pathname) => pathname.startsWith("/dashboard/analiticas"),
      },
      {
        href: "/dashboard/ventas",
        label: "Reportes",
        description: "Exportación de datos e informes",
        icon: FileSpreadsheet,
        match: (pathname) => pathname.startsWith("/dashboard/ventas"),
      },
    ],
  },
  {
    id: "configuration",
    label: "Configuración y Equipo",
    items: [
      {
        href: "/dashboard/tasas",
        label: "Tasas del día",
        description: "Configuración de divisas",
        icon: RefreshCw,
        match: (pathname) => pathname.startsWith("/dashboard/tasas"),
      },
      {
        href: "/dashboard/planes",
        label: "Equipo",
        description: "Gestión de usuarios y accesos",
        icon: UserCog,
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
