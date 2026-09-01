"use client";

import {
  Award,
  Bot,
  MessageSquare,
  Package,
  Store,
  Users,
  Truck,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import type { AdminDashboardTab } from "@/lib/admin/dashboard-nav";
import { cn } from "@/lib/cn";
import {
  getDashboardNavItems,
  isDashboardNavItemActive,
  ADMIN_OWN_STORE_NAV_PREFIX,
} from "@/src/config/dashboard-nav";

export type { AdminDashboardTab };

interface AdminNavItem {
  id: AdminDashboardTab;
  label: string;
  description: string;
  icon: LucideIcon;
  showBadge?: boolean;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    id: "tienda",
    label: "Mi Tienda",
    description:
      "Catálogo, órdenes, clientes, analíticas y configuración — con precio de costo de proveedor.",
    icon: Store,
  },
  {
    id: "dropship",
    label: "Liquidaciones dropship",
    description: "Cierres diarios, verificación de pago único y despacho D+1.",
    icon: Truck,
    showBadge: true,
  },
  {
    id: "proveedor",
    label: "Proveedor / Mayorista",
    description:
      "Producto, costo y precio mayorista. Publica o oculta el catálogo entero de cada proveedor.",
    icon: Warehouse,
    showBadge: true,
  },
  {
    id: "marcas",
    label: "Marcas destacadas",
    description:
      "Marcas oficiales de Alcéntimo (nombre y logo) para las vitrinas de dropshippers.",
    icon: Award,
  },
  {
    id: "tiendas",
    label: "Gestión de usuarios",
    description: "Directorio de proveedores y dropshippers.",
    icon: Users,
  },
  {
    id: "envios",
    label: "Envíos",
    description:
      "Agencias nacionales y envío gratis global para todas las vitrinas.",
    icon: Package,
  },
  {
    id: "soporte",
    label: "Soporte y mensajes",
    description: "Bandeja centralizada de atención al cliente.",
    icon: MessageSquare,
    showBadge: true,
  },
  {
    id: "ia",
    label: "IA gerencial",
    description: "Consultas en lenguaje natural sobre el SaaS.",
    icon: Bot,
  },
];

interface AdminDashboardShellProps {
  activeTab: AdminDashboardTab;
  onTabChange: (tab: AdminDashboardTab) => void;
  badgeCounts?: Partial<Record<AdminDashboardTab, number>>;
  children: React.ReactNode;
}

export function AdminDashboardShell({
  activeTab,
  onTabChange,
  badgeCounts = {},
  children,
}: AdminDashboardShellProps) {
  const pathname = usePathname() ?? "";
  const storeNav = getDashboardNavItems({
    storeRole: "owner",
    variant: "admin_own_store",
  });
  const showStoreTools = activeTab === "tienda";
  const activeMeta =
    ADMIN_NAV_ITEMS.find((item) => item.id === activeTab) ?? ADMIN_NAV_ITEMS[0];

  return (
    <div className="admin-dashboard-layout">
      <aside className="admin-dashboard-sidebar">
        <nav className="admin-dashboard-nav" aria-label="Secciones de administración">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeTab;
            const badge = item.showBadge ? badgeCounts[item.id] ?? 0 : 0;
            return (
              <div key={item.id}>
                <button
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "admin-dashboard-nav-item",
                    active && "admin-dashboard-nav-item-active",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-left">{item.label}</span>
                  {badge > 0 ? (
                    <span className="admin-dashboard-nav-badge">{badge}</span>
                  ) : null}
                </button>
                {item.id === "tienda" && showStoreTools ? (
                  <div
                    className="admin-own-store-nav"
                    aria-label="Herramientas de Mi Tienda"
                  >
                    {storeNav.map((tool) => {
                      const ToolIcon = tool.icon;
                      const toolActive = isDashboardNavItemActive(
                        pathname,
                        tool,
                      );
                      return (
                        <Link
                          key={tool.href}
                          href={tool.href}
                          title={tool.description}
                          className={cn(
                            "admin-own-store-nav-item",
                            toolActive && "admin-own-store-nav-item-active",
                          )}
                        >
                          <ToolIcon
                            className="h-3.5 w-3.5 shrink-0 opacity-70"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1 text-left">
                            {tool.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="admin-dashboard-content">
        <header className="admin-dashboard-content-header">
          <h1 className="text-[1.375rem] font-medium tracking-tight text-zinc-900 dark:text-zinc-50">
            {activeMeta.label}
          </h1>
        </header>
        <div
          className={cn(
            "admin-dashboard-content-body",
            showStoreTools && "admin-dashboard-content-body-store",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function useAdminControlCenterNavigation() {
  const router = useRouter();

  function goToTab(tab: AdminDashboardTab) {
    if (tab === "tienda") {
      router.push(`${ADMIN_OWN_STORE_NAV_PREFIX}/catalogo`);
      return;
    }
    router.push(`/admin/dashboard?tab=${tab}`);
  }

  return { goToTab };
}
