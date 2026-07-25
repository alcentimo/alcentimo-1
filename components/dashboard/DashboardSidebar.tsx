"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  LifeBuoy,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { SupportModal } from "@/components/dashboard/SupportModal";
import { DashboardAccountMenu } from "@/components/dashboard/account/DashboardAccountMenu";
import {
  getDashboardNavItems,
  isDashboardNavItemActive,
  type DashboardNavItem,
} from "@/src/config/dashboard-nav";
import { cn } from "@/lib/cn";
import { useLocale } from "@/components/providers/UiPreferencesProvider";
import { useDashboardRoutePrefetch } from "@/components/dashboard/use-dashboard-route-prefetch";
import type { DashboardStoreRole } from "@/lib/team/permissions";
import { isDashboardStoreOwner } from "@/lib/team/permissions";

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
  isSupportAdmin?: boolean;
  isStoreOwner?: boolean;
  storeRole?: DashboardStoreRole | null;
  canUpgradeToBusiness?: boolean;
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
  label,
  active,
  collapsed,
  onNavigate,
  onPrefetch,
}: {
  item: DashboardNavItem;
  label: string;
  active: boolean;
  collapsed: boolean;
  onNavigate: () => void;
  onPrefetch: (href: string) => void;
}) {
  const Icon = item.icon;

  function handlePrefetch() {
    if (!active) {
      onPrefetch(item.href);
    }
  }

  return (
    <Link
      href={item.href}
      prefetch={true}
      className={navLinkClass(active, collapsed)}
      onClick={onNavigate}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      onTouchStart={handlePrefetch}
      title={collapsed ? `${label} — ${item.description}` : item.description}
      aria-current={active ? "page" : undefined}
    >
      <Icon
        className={cn("shrink-0", collapsed ? "h-[18px] w-[18px]" : "h-4 w-4")}
        strokeWidth={active ? 2 : 1.75}
        aria-hidden="true"
      />
      {!collapsed && <span className="truncate">{label}</span>}
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
  isSupportAdmin = false,
  storeRole = null,
  canUpgradeToBusiness = false,
}: DashboardSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportKey, setSupportKey] = useState(0);
  const navItems = getDashboardNavItems({ storeRole });
  const showOwnerBillingLinks = isDashboardStoreOwner(storeRole);
  const { t, navLabel } = useLocale();
  const { prefetchRoute } = useDashboardRoutePrefetch();

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
      if (stored === "1") setCollapsed(true);
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    function handleOpenSupport() {
      setSupportKey((key) => key + 1);
      setSupportOpen(true);
      onCloseMobile();
    }

    window.addEventListener("alcentimo:open-support", handleOpenSupport);
    return () => {
      window.removeEventListener("alcentimo:open-support", handleOpenSupport);
    };
  }, [onCloseMobile]);

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

  const drawerExpanded = mobileOpen || !collapsed;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-full shrink-0 flex-col border-r border-zinc-200/90 bg-white transition-[width,transform] duration-200 ease-out dark:border-zinc-800 dark:bg-zinc-950 lg:static lg:z-auto lg:translate-x-0",
        drawerExpanded ? "w-[min(85vw,16rem)] lg:w-64" : "w-[4.5rem]",
        immersiveHidden
          ? "-translate-x-full lg:hidden"
          : mobileOpen
            ? "translate-x-0 shadow-xl"
            : "-translate-x-full lg:translate-x-0 lg:shadow-none",
      )}
      aria-label="Barra lateral del panel"
      aria-hidden={immersiveHidden}
    >
      <div
        className={cn(
          "flex items-center border-b border-zinc-200 dark:border-zinc-800",
          drawerExpanded ? "justify-between gap-2 px-4 py-4" : "justify-center px-2 py-4",
        )}
      >
        <BrandLogo
          href="/dashboard/catalogo"
          subtitle={drawerExpanded ? storeName ?? "Panel" : undefined}
          showName={false}
          responsive={drawerExpanded}
          size={drawerExpanded ? "md" : "sm"}
          className={drawerExpanded ? "" : "justify-center"}
        />
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onCloseMobile}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 lg:hidden dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
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
      </div>

      <nav
        className={cn(
          "flex flex-1 flex-col gap-1 overflow-y-auto py-4",
          drawerExpanded ? "px-3" : "px-2",
        )}
        aria-label="Navegación principal"
      >
        {navItems.map((item) => (
          <SidebarNavLink
            key={item.href}
            item={item}
            label={navLabel(item.href, item.label)}
            active={isDashboardNavItemActive(pathname, item)}
            collapsed={!drawerExpanded}
            onNavigate={onCloseMobile}
            onPrefetch={prefetchRoute}
          />
        ))}
      </nav>

      <div
        className={cn(
          "border-t border-zinc-200 dark:border-zinc-800",
          drawerExpanded ? "space-y-3 px-0 py-4" : "space-y-2 px-2 py-3",
        )}
      >
        <div className={cn(drawerExpanded ? "px-3" : "px-0")}>
          <DashboardAccountMenu
            userEmail={userEmail}
            planName={planName}
            expanded={drawerExpanded}
            showOwnerBillingLinks={showOwnerBillingLinks}
            canUpgradeToBusiness={canUpgradeToBusiness}
            onLogout={onLogout}
            onNavigate={onCloseMobile}
          />

          <button
            type="button"
            onClick={() => {
              setSupportKey((key) => key + 1);
              setSupportOpen(true);
              onCloseMobile();
            }}
            className={cn(navLinkClass(false, !drawerExpanded), "mt-2")}
            title={drawerExpanded ? undefined : t("nav.support")}
          >
            <LifeBuoy className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            {drawerExpanded && <span>{t("nav.support")}</span>}
          </button>

          {isSupportAdmin ? (
            <Link
              href="/admin/dashboard"
              prefetch={true}
              className={cn(
                navLinkClass(pathname.startsWith("/admin"), !drawerExpanded),
                "mt-1",
              )}
              onClick={onCloseMobile}
              onMouseEnter={() => prefetchRoute("/admin/dashboard")}
              onFocus={() => prefetchRoute("/admin/dashboard")}
              onTouchStart={() => prefetchRoute("/admin/dashboard")}
              title={drawerExpanded ? undefined : "Panel Admin"}
              aria-current={pathname.startsWith("/admin") ? "page" : undefined}
            >
              <LayoutDashboard
                className="h-4 w-4 shrink-0"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              {drawerExpanded && <span>Panel Admin</span>}
            </Link>
          ) : null}
        </div>
      </div>

      <SupportModal
        key={supportKey}
        open={supportOpen}
        onOpenChange={setSupportOpen}
      />
    </aside>
  );
}
