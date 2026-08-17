"use client";

import {
  BarChart3,
  Bot,
  CreditCard,
  LayoutDashboard,
  MessageSquare,
  Settings2,
  Store,
  Tag,
  Truck,
} from "lucide-react";
import Link from "next/link";
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
    id: "resumen",
    label: "Resumen",
    description: "Métricas clave, planes e ingresos del SaaS.",
    icon: LayoutDashboard,
  },
  {
    id: "pagos",
    label: "Pagos y activaciones",
    description: "Comprobantes pendientes, aprobados y rechazados.",
    icon: CreditCard,
    showBadge: true,
  },
  {
    id: "dropship",
    label: "Liquidaciones dropship",
    description: "Cierres diarios, verificación de pago único y despacho D+1.",
    icon: Truck,
    showBadge: true,
  },
  {
    id: "tiendas",
    label: "Tiendas y usuarios",
    description: "Listado de tiendas, dominios y sucursales.",
    icon: Store,
  },
  {
    id: "cupones",
    label: "Cupones y Ofertas",
    description: "Códigos promocionales y ofertas temporales del SaaS.",
    icon: Tag,
  },
  {
    id: "planes",
    label: "Planes y precios",
    description: "Límites, costos y configuración de la plataforma.",
    icon: Settings2,
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
        <p className="admin-dashboard-sidebar-title">Centro de control</p>
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
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 text-left">{item.label}</span>
                {badge > 0 ? (
                  <span className="admin-dashboard-nav-badge">{badge}</span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="admin-dashboard-sidebar-footer space-y-3">
          <Link
            href="/mercado-oculto"
            className="flex w-full items-center justify-center rounded-xl bg-teal-700 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            Mercado oculto
          </Link>
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
            Gestión centralizada
          </div>
        </div>
      </aside>

      <div className="admin-dashboard-content">
        <header className="admin-dashboard-content-header">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {activeMeta.label}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {activeMeta.description}
            </p>
          </div>
        </header>
        <div className="admin-dashboard-content-body">{children}</div>
      </div>
    </div>
  );
}
