"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Store,
  Warehouse,
  X,
} from "lucide-react";
import { SupportModal } from "@/components/dashboard/SupportModal";
import { DashboardAccountMenu } from "@/components/dashboard/account/DashboardAccountMenu";
import {
  getDashboardNavItems,
  isDashboardNavItemActive,
  type DashboardNavItem,
  type DashboardNavVariant,
} from "@/src/config/dashboard-nav";
import { cn } from "@/lib/cn";
import { useLocale } from "@/components/providers/UiPreferencesProvider";
import { useDashboardRoutePrefetch } from "@/components/dashboard/use-dashboard-route-prefetch";
import type { DashboardStoreRole } from "@/lib/team/permissions";
import {
  BRAND_FAVICON_32_PATH,
  BRAND_LOGO_HEIGHT,
  BRAND_LOGO_PATH,
  BRAND_LOGO_WIDTH,
} from "@/lib/brand/assets";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "alcentimo-dashboard-sidebar-collapsed";
const DASHBOARD_HOME_HREF = "/dashboard/catalogo";

interface DashboardSidebarProps {
  pathname: string;
  storeName: string | null;
  pendingOrdersCount?: number;
  mobileOpen: boolean;
  immersiveHidden: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
  onOpenAccountSettings: () => void;
  onPrefetchAccountSettings?: () => void;
  accountSettingsActive?: boolean;
  isSupportAdmin?: boolean;
  showSupplierHubLink?: boolean;
  showMerchantStoreLink?: boolean;
  storeRole?: DashboardStoreRole | null;
  navVariant?: DashboardNavVariant | null;
  homeHref?: string;
}

function navLinkClass(
  active: boolean,
  collapsed: boolean,
  /** Acciones inferiores del drawer móvil: menos alto/padding. */
  dense = false,
) {
  return cn(
    "group relative flex w-full items-center rounded-lg border-l-[3px] font-medium transition-colors",
    dense ? "text-[13px]" : "text-sm",
    collapsed
      ? "h-10 justify-center border-transparent px-0"
      : dense
        ? "min-h-8 gap-2.5 border-transparent px-3 py-1.5"
        : "min-h-10 gap-3 border-transparent px-3 py-2",
    active
      ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100",
  );
}

function formatNavBadgeCount(count: number): string {
  if (count > 99) return "99+";
  return String(count);
}

function SidebarNavLink({
  item,
  label,
  active,
  collapsed,
  badgeCount = 0,
  onNavigate,
  onPrefetch,
}: {
  item: DashboardNavItem;
  label: string;
  active: boolean;
  collapsed: boolean;
  badgeCount?: number;
  onNavigate: () => void;
  onPrefetch: (href: string) => void;
}) {
  const Icon = item.icon;
  const showBadge = badgeCount > 0;
  const badgeLabel = showBadge ? formatNavBadgeCount(badgeCount) : null;

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
      title={
        collapsed
          ? `${label}${showBadge ? ` (${badgeCount})` : ""} — ${item.description}`
          : item.description
      }
      aria-current={active ? "page" : undefined}
      aria-label={
        showBadge ? `${label}, ${badgeCount} pendientes` : undefined
      }
    >
      <span className="relative shrink-0">
        <Icon
          className={cn(collapsed ? "h-[18px] w-[18px]" : "h-4 w-4")}
          strokeWidth={active ? 2 : 1.75}
          aria-hidden="true"
        />
        {collapsed && showBadge ? (
          <span
            className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white"
            aria-hidden="true"
          >
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        ) : null}
      </span>
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && showBadge && badgeLabel ? (
        <span className="dashboard-nav-badge ml-auto shrink-0">{badgeLabel}</span>
      ) : null}
    </Link>
  );
}

export function DashboardSidebar({
  pathname,
  storeName: _storeName,
  pendingOrdersCount = 0,
  mobileOpen,
  immersiveHidden,
  onCloseMobile,
  onLogout,
  onOpenAccountSettings,
  onPrefetchAccountSettings,
  accountSettingsActive = false,
  isSupportAdmin = false,
  showSupplierHubLink = false,
  showMerchantStoreLink = false,
  storeRole = null,
  navVariant = "merchant",
  homeHref = DASHBOARD_HOME_HREF,
}: DashboardSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportKey, setSupportKey] = useState(0);
  const navItems = getDashboardNavItems({ storeRole, variant: navVariant });
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
        window.localStorage.setItem(
          SIDEBAR_COLLAPSED_STORAGE_KEY,
          next ? "1" : "0",
        );
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
        "fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col border-r border-zinc-200/90 bg-white transition-[width,transform] duration-200 ease-out dark:border-zinc-800 dark:bg-zinc-950 lg:static lg:z-auto lg:h-full lg:translate-x-0",
        // Móvil: altura de viewport fija + sin scroll del documento (solo scroll interno).
        mobileOpen
          ? "h-dvh max-h-dvh overflow-hidden overscroll-none"
          : "h-full",
        drawerExpanded
          ? mobileOpen
            ? "w-[min(92vw,19.5rem)] lg:w-64"
            : "w-[min(85vw,16rem)] lg:w-64"
          : "w-[4.5rem]",
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
          "flex shrink-0 items-center border-b border-zinc-200 dark:border-zinc-800",
          drawerExpanded
            ? mobileOpen
              ? "justify-between gap-2 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
              : "justify-between gap-2 px-4 py-3"
            : "flex-col gap-2 px-2 py-3",
        )}
      >
        <Link
          href={homeHref}
          className={cn(
            "dashboard-sidebar-brand inline-flex min-w-0 items-center border-0 bg-transparent shadow-none outline-none",
            drawerExpanded ? "flex-1" : "justify-center",
          )}
          aria-label="Alcentimo"
          onClick={onCloseMobile}
        >
          {drawerExpanded ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={BRAND_LOGO_PATH}
              width={BRAND_LOGO_WIDTH}
              height={BRAND_LOGO_HEIGHT}
              alt="Alcentimo"
              className="block h-8 w-auto max-w-[9.5rem] shrink-0 border-0 bg-transparent object-contain object-left shadow-none outline-none"
              decoding="async"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={BRAND_FAVICON_32_PATH}
              width={32}
              height={32}
              alt="Alcentimo"
              className="block h-7 w-7 shrink-0 border-0 bg-transparent object-contain shadow-none outline-none"
              decoding="async"
            />
          )}
        </Link>
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
            aria-label={
              collapsed ? "Expandir menú lateral" : "Colapsar menú lateral"
            }
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

      {/*
        Móvil: cuerpo sin scroll (contenido compacto bajo cabecera fija).
        Desktop: `contents` para que nav (flex-1) y pie (pinned) sigan el flex del aside.
      */}
      <div
        className={
          mobileOpen
            ? "flex min-h-0 flex-1 flex-col overflow-hidden"
            : "contents"
        }
      >
        <nav
          className={cn(
            "flex flex-col",
            mobileOpen
              ? "min-h-0 grow-0"
              : "min-h-0 flex-1 overflow-y-auto overscroll-y-contain",
            mobileOpen && drawerExpanded
              ? "gap-0.5 px-4 pb-0 pt-2.5"
              : drawerExpanded
                ? "gap-1 px-3 py-4"
                : "gap-1 px-2 py-4",
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
              badgeCount={
                item.href === "/dashboard/pedidos" ||
                item.href === "/proveedor/dashboard/hub/pedidos"
                  ? Math.max(0, pendingOrdersCount)
                  : 0
              }
              onNavigate={onCloseMobile}
              onPrefetch={prefetchRoute}
            />
          ))}
        </nav>

        {/* Espacio obligatorio (≥2rem) entre Reportar Pago y Plan. */}
        {mobileOpen ? (
          <div
            className="min-h-8 w-full shrink-0 grow basis-8"
            aria-hidden="true"
          />
        ) : null}

        <div
          className={cn(
            "border-t border-zinc-200 dark:border-zinc-800",
            mobileOpen ? "mt-0 shrink-0" : "shrink-0",
            mobileOpen && drawerExpanded
              ? "space-y-1.5 px-4 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
              : drawerExpanded
                ? "px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
                : "px-2 py-3",
          )}
        >
          <div
            className={cn(
              mobileOpen && drawerExpanded ? "space-y-0" : "space-y-1",
            )}
          >
            <DashboardAccountMenu
              expanded={drawerExpanded}
              active={accountSettingsActive}
              navLinkClass={(active, collapsed) =>
                navLinkClass(
                  active,
                  collapsed,
                  mobileOpen && drawerExpanded,
                )
              }
              onOpenAccountSettings={onOpenAccountSettings}
              onPrefetchAccountSettings={onPrefetchAccountSettings}
            />

            {showMerchantStoreLink ? (
              <Link
                href="/dashboard/catalogo"
                prefetch={true}
                className={navLinkClass(
                  false,
                  !drawerExpanded,
                  mobileOpen && drawerExpanded,
                )}
                onClick={onCloseMobile}
                onMouseEnter={() => prefetchRoute("/dashboard/catalogo")}
                onFocus={() => prefetchRoute("/dashboard/catalogo")}
                onTouchStart={() => prefetchRoute("/dashboard/catalogo")}
                title={drawerExpanded ? undefined : "Ir a mi tienda"}
              >
                <Store
                  className="h-4 w-4 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                {drawerExpanded && <span>Ir a mi tienda</span>}
              </Link>
            ) : null}

            {showSupplierHubLink ? (
              <Link
                href="/proveedor/dashboard/hub"
                prefetch={true}
                className={navLinkClass(
                  pathname.startsWith("/proveedor"),
                  !drawerExpanded,
                  mobileOpen && drawerExpanded,
                )}
                onClick={onCloseMobile}
                onMouseEnter={() => prefetchRoute("/proveedor/dashboard/hub")}
                onFocus={() => prefetchRoute("/proveedor/dashboard/hub")}
                onTouchStart={() => prefetchRoute("/proveedor/dashboard/hub")}
                title={drawerExpanded ? undefined : "Hub de proveedores"}
                aria-current={
                  pathname.startsWith("/proveedor") ? "page" : undefined
                }
              >
                <Warehouse
                  className="h-4 w-4 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                {drawerExpanded && <span>Hub de proveedores</span>}
              </Link>
            ) : null}

            {isSupportAdmin ? (
              <Link
                href="/admin/dashboard"
                prefetch={true}
                className={navLinkClass(
                  pathname.startsWith("/admin"),
                  !drawerExpanded,
                  mobileOpen && drawerExpanded,
                )}
                onClick={onCloseMobile}
                onMouseEnter={() => prefetchRoute("/admin/dashboard")}
                onFocus={() => prefetchRoute("/admin/dashboard")}
                onTouchStart={() => prefetchRoute("/admin/dashboard")}
                title={drawerExpanded ? undefined : "Panel Admin"}
                aria-current={
                  pathname.startsWith("/admin") ? "page" : undefined
                }
              >
                <LayoutDashboard
                  className="h-4 w-4 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                {drawerExpanded && <span>Panel Admin</span>}
              </Link>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setSupportKey((key) => key + 1);
                setSupportOpen(true);
                onCloseMobile();
              }}
              className={navLinkClass(
                false,
                !drawerExpanded,
                mobileOpen && drawerExpanded,
              )}
              title={drawerExpanded ? undefined : t("nav.support")}
            >
              <LifeBuoy
                className="h-4 w-4 shrink-0"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              {drawerExpanded && <span>{t("nav.support")}</span>}
            </button>

            <button
              type="button"
              className={cn(
                navLinkClass(
                  false,
                  !drawerExpanded,
                  mobileOpen && drawerExpanded,
                ),
                "touch-manipulation text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300",
              )}
              onClick={onLogout}
              title={drawerExpanded ? undefined : "Cerrar sesión"}
            >
              <LogOut
                className={cn(
                  "shrink-0",
                  !drawerExpanded
                    ? "h-[18px] w-[18px]"
                    : mobileOpen
                      ? "h-3.5 w-3.5"
                      : "h-4 w-4",
                )}
                strokeWidth={1.75}
                aria-hidden="true"
              />
              {drawerExpanded && (
                <span className="truncate">Cerrar sesión</span>
              )}
            </button>
          </div>
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
