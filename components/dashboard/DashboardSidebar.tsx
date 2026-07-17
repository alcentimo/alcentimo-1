"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogOut, PanelLeftClose, PanelLeftOpen, Rocket } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { DASHBOARD_PLANS_HREF } from "@/src/config/plans";
import {
  DASHBOARD_NAV_ITEMS,
  isDashboardNavItemActive,
  type DashboardNavItem,
} from "@/src/config/dashboard-nav";
import { cn } from "@/lib/cn";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "alcentimo-dashboard-sidebar-collapsed";

interface DashboardSidebarProps {
  pathname: string;
  storeName: string | null;
  userEmail: string | null;
  planName?: string | null;
  mobileOpen: boolean;
  immersiveHidden: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
}

function navLinkClass(active: boolean, collapsed: boolean) {
  return cn(
    "group relative flex w-full items-center rounded-lg border-l-[3px] text-sm font-medium transition-colors",
    collapsed ? "h-10 justify-center border-transparent px-0" : "min-h-10 gap-3 border-transparent px-3 py-2",
    active
      ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100",
  );
}

function SidebarNavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: DashboardNavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={navLinkClass(active, collapsed)}
      onClick={onNavigate}
      title={collapsed ? `${item.label} — ${item.description}` : item.description}
      aria-current={active ? "page" : undefined}
    >
      <Icon
        className={cn("shrink-0", collapsed ? "h-[18px] w-[18px]" : "h-4 w-4")}
        strokeWidth={active ? 2 : 1.75}
        aria-hidden="true"
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

export function DashboardSidebar({
  pathname,
  storeName,
  userEmail,
  planName = null,
  mobileOpen,
  immersiveHidden,
  onCloseMobile,
  onLogout,
}: DashboardSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
      if (stored === "1") setCollapsed(true);
    } catch {
      // ignore storage errors
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-full shrink-0 flex-col border-r border-zinc-200/90 bg-white transition-[width,transform] duration-200 ease-out dark:border-zinc-800 dark:bg-zinc-950 lg:static lg:z-auto lg:translate-x-0",
        collapsed ? "w-[4.5rem]" : "w-64",
        immersiveHidden
          ? "-translate-x-full lg:hidden"
          : mobileOpen
            ? "translate-x-0 shadow-xl"
            : "-translate-x-full lg:shadow-none",
      )}
      aria-label="Barra lateral del panel"
      aria-hidden={immersiveHidden}
    >
      <div
        className={cn(
          "flex items-center border-b border-zinc-200 dark:border-zinc-800",
          collapsed ? "justify-center px-2 py-4" : "justify-between gap-2 px-4 py-4",
        )}
      >
        <BrandLogo
          href="/dashboard/catalogo"
          subtitle={collapsed ? undefined : storeName ?? "Panel"}
          showName={!collapsed}
          size={collapsed ? "sm" : "md"}
          className={collapsed ? "justify-center" : ""}
        />
        <button
          type="button"
          onClick={toggleCollapsed}
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 lg:inline-flex dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
          aria-label={collapsed ? "Expandir menú lateral" : "Colapsar menú lateral"}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      <nav
        className={cn(
          "flex flex-1 flex-col gap-1 overflow-y-auto py-4",
          collapsed ? "px-2" : "px-3",
        )}
        aria-label="Navegación principal"
      >
        {DASHBOARD_NAV_ITEMS.map((item) => (
          <SidebarNavLink
            key={item.href}
            item={item}
            active={isDashboardNavItemActive(pathname, item)}
            collapsed={collapsed}
            onNavigate={onCloseMobile}
          />
        ))}
      </nav>

      <div
        className={cn(
          "border-t border-zinc-200 dark:border-zinc-800",
          collapsed ? "space-y-2 px-2 py-3" : "space-y-3 px-0 py-4",
        )}
      >
        <div className={cn(collapsed ? "space-y-1" : "space-y-1 px-3")}>
          {!collapsed && planName && (
            <p className="truncate px-1 text-xs font-medium text-teal-700 dark:text-teal-400">
              {planName}
            </p>
          )}
          {!collapsed && userEmail && (
            <p className="truncate px-1 text-xs text-zinc-500 dark:text-zinc-400">
              {userEmail}
            </p>
          )}

          <Link
            href="/activar"
            className={navLinkClass(pathname === "/activar", collapsed)}
            onClick={onCloseMobile}
            title={collapsed ? "Activar cuenta" : undefined}
          >
            <Rocket className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            {!collapsed && <span>Activar cuenta</span>}
          </Link>

          <button
            type="button"
            onClick={onLogout}
            className={navLinkClass(false, collapsed)}
            title={collapsed ? "Cerrar sesión" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>

          {!collapsed && (
            <p className="px-1 pt-1 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
              <Link
                href={DASHBOARD_PLANS_HREF}
                className="hover:text-zinc-600 dark:hover:text-zinc-300"
                onClick={onCloseMobile}
              >
                Planes
              </Link>
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
