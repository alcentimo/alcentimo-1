"use client";

import {
  Award,
  Bot,
  Gift,
  MessageSquare,
  Package,
  Users,
  Truck,
  Warehouse,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AdminDashboardTab } from "@/lib/admin/dashboard-nav";
import { cn } from "@/lib/cn";

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
    id: "giftcards",
    label: "Tarjetas de regalo",
    description:
      "Emisión y saldo exclusivo de la vitrina del administrador.",
    icon: Gift,
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
              <button
                key={item.id}
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
        <div className="admin-dashboard-content-body">{children}</div>
      </div>
    </div>
  );
}
