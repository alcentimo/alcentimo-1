import {
  Banknote,
  BarChart3,
  Bot,
  ClipboardList,
  Settings2,
  Store,
  // UserCog, // Equipo oculto por ahora (no se usa en menú de tiendas)
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  canAccessDashboardPath,
  type DashboardStoreRole,
} from "@/lib/team/permissions";

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
    description: "Productos disponibles y lo que vendes en tu tienda",
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
    match: (pathname) =>
      pathname.startsWith("/dashboard/pedidos") ||
      pathname.startsWith("/dashboard/ventas"),
  },
  {
    href: "/dashboard/clientes",
    label: "Mis Clientes",
    description: "Clientes registrados y su historial de compras",
    icon: Users,
    match: (pathname) => pathname.startsWith("/dashboard/clientes"),
  },
  // Equipo oculto: no se usa por ahora en dashboards de tienda.
  // {
  //   href: "/dashboard/equipo",
  //   label: "Equipo",
  //   description: "Invita encargados y vendedores a tu panel",
  //   icon: UserCog,
  //   match: (pathname) => pathname.startsWith("/dashboard/equipo"),
  // },
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
  {
    href: "/dashboard/liquidacion",
    label: "Reportar Pago",
    description: "Cierre diario y pago único a Alcéntimo",
    icon: Banknote,
    match: (pathname) => pathname.startsWith("/dashboard/liquidacion"),
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

export type DashboardNavVariant = "merchant" | "supplier_own_store";

export const SUPPLIER_OWN_STORE_NAV_PREFIX = "/proveedor/dashboard";

export function remapDashboardHrefForVariant(
  href: string,
  variant?: DashboardNavVariant | null,
): string {
  if (variant !== "supplier_own_store") return href;
  if (href === "/dashboard" || href.startsWith("/dashboard/")) {
    return `${SUPPLIER_OWN_STORE_NAV_PREFIX}${href.slice("/dashboard".length)}`;
  }
  return href;
}

function toMerchantDashboardPath(pathname: string): string {
  if (pathname === SUPPLIER_OWN_STORE_NAV_PREFIX) {
    return "/dashboard";
  }
  if (pathname.startsWith(`${SUPPLIER_OWN_STORE_NAV_PREFIX}/`)) {
    return `/dashboard${pathname.slice(SUPPLIER_OWN_STORE_NAV_PREFIX.length)}`;
  }
  return pathname;
}

export function getDashboardNavItems(options?: {
  storeRole?: DashboardStoreRole | null;
  variant?: DashboardNavVariant | null;
}): DashboardNavItem[] {
  const role = options?.storeRole ?? null;
  const variant = options?.variant ?? "merchant";
  const source = !role
    ? DASHBOARD_NAV_ITEMS.filter((item) =>
        canAccessDashboardPath("owner", item.href),
      )
    : DASHBOARD_NAV_ITEMS.filter((item) =>
        canAccessDashboardPath(role, item.href),
      );

  if (variant !== "supplier_own_store") {
    return source;
  }

  return source.map((item) => {
    const href = remapDashboardHrefForVariant(item.href, variant);
    const isCatalog = item.href === "/dashboard/catalogo";
    return {
      ...item,
      href,
      label: isCatalog ? "Productos Propios" : item.label,
      description: isCatalog
        ? "Mercancía de tu inventario, sin catálogo de terceros"
        : item.description,
      match: (pathname: string) => {
        if (isCatalog) {
          return (
            pathname === SUPPLIER_OWN_STORE_NAV_PREFIX ||
            pathname.startsWith(`${SUPPLIER_OWN_STORE_NAV_PREFIX}/catalogo`) ||
            pathname.startsWith(`${SUPPLIER_OWN_STORE_NAV_PREFIX}/inventario`) ||
            pathname.startsWith(`${SUPPLIER_OWN_STORE_NAV_PREFIX}/productos`)
          );
        }
        return item.match
          ? item.match(toMerchantDashboardPath(pathname))
          : pathname === href;
      },
    };
  });
}
