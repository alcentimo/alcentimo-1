import {
  BarChart3,
  Bot,
  ClipboardList,
  Settings2,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface DashboardNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  match?: (pathname: string) => boolean;
  /** Solo visible para el dueño de la tienda (`stores.owner_id`). */
  ownerOnly?: boolean;
}

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  {
    href: "/dashboard/catalogo",
    label: "Catálogo",
    description: "Lo que vendes: productos, fotos, precios y stock",
    icon: Store,
    match: (pathname) =>
      pathname.startsWith("/dashboard/catalogo") ||
      pathname.startsWith("/dashboard/inventario") ||
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
    href: "/dashboard/clientes",
    label: "Mis Clientes",
    description: "Clientes registrados y su historial de compras",
    icon: Users,
    match: (pathname) => pathname.startsWith("/dashboard/clientes"),
    ownerOnly: true,
  },
  {
    href: "/dashboard/analiticas",
    label: "Analíticas",
    description: "Métricas de rendimiento",
    icon: BarChart3,
    match: (pathname) => pathname.startsWith("/dashboard/analiticas"),
  },
  {
    href: "/dashboard/asistente",
    label: "Asistente IA",
    description: "Consultas de inventario, ventas y operaciones",
    icon: Bot,
    match: (pathname) => pathname.startsWith("/dashboard/asistente"),
  },
  {
    href: "/dashboard/ajustes",
    label: "Configuración de Tienda",
    description: "Cómo se ve tu negocio: marca, pagos y horarios",
    icon: Settings2,
    match: (pathname) => pathname.startsWith("/dashboard/ajustes"),
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

export function getDashboardNavItems(options?: {
  isStoreOwner?: boolean;
}): DashboardNavItem[] {
  const isStoreOwner = options?.isStoreOwner ?? false;
  return DASHBOARD_NAV_ITEMS.filter(
    (item) => !item.ownerOnly || isStoreOwner,
  );
}
