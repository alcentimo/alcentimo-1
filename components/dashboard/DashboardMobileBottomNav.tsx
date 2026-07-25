"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import {
  getDashboardMobileBottomNavItems,
  isDashboardNavItemActive,
  type DashboardNavItem,
} from "@/src/config/dashboard-nav";
import { useLocale } from "@/components/providers/UiPreferencesProvider";
import { useDashboardRoutePrefetch } from "@/components/dashboard/use-dashboard-route-prefetch";
import type { DashboardStoreRole } from "@/lib/team/permissions";
import { cn } from "@/lib/cn";

interface DashboardMobileBottomNavProps {
  pathname: string;
  storeRole?: DashboardStoreRole | null;
  onOpenMenu: () => void;
}

function BottomNavLink({
  item,
  label,
  active,
  onPrefetch,
}: {
  item: DashboardNavItem;
  label: string;
  active: boolean;
  onPrefetch: (href: string) => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      prefetch={true}
      className={cn(
        "bottom-nav-item",
        active ? "bottom-nav-item-active" : "bottom-nav-item-default",
      )}
      aria-current={active ? "page" : undefined}
      onMouseEnter={() => !active && onPrefetch(item.href)}
      onFocus={() => !active && onPrefetch(item.href)}
      onTouchStart={() => !active && onPrefetch(item.href)}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2 : 1.75} aria-hidden="true" />
      <span className="max-w-full truncate px-0.5 text-[10px] leading-tight">{label}</span>
    </Link>
  );
}

export function DashboardMobileBottomNav({
  pathname,
  storeRole = null,
  onOpenMenu,
}: DashboardMobileBottomNavProps) {
  const { navLabel } = useLocale();
  const { prefetchRoute } = useDashboardRoutePrefetch();
  const items = getDashboardMobileBottomNavItems({ storeRole });
  const menuActive =
    !items.some((item) => isDashboardNavItemActive(pathname, item)) &&
    (pathname.startsWith("/dashboard/analiticas") ||
      pathname.startsWith("/dashboard/asistente") ||
      pathname.startsWith("/dashboard/equipo") ||
      pathname.startsWith("/dashboard/cuenta") ||
      pathname.startsWith("/dashboard/tasas") ||
      pathname.startsWith("/dashboard/planes") ||
      pathname.startsWith("/dashboard/upgrade") ||
      pathname.startsWith("/dashboard/mensajes") ||
      pathname.startsWith("/dashboard/soporte") ||
      pathname.startsWith("/dashboard/referidos") ||
      pathname.startsWith("/dashboard/ventas") ||
      pathname.startsWith("/activar") ||
      pathname.startsWith("/admin"));

  return (
    <nav className="bottom-nav" aria-label="Navegación principal móvil">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
        {items.map((item) => (
          <BottomNavLink
            key={item.href}
            item={item}
            label={navLabel(item.href, item.label)}
            active={isDashboardNavItemActive(pathname, item)}
            onPrefetch={prefetchRoute}
          />
        ))}
        <button
          type="button"
          className={cn(
            "bottom-nav-item",
            menuActive ? "bottom-nav-item-active" : "bottom-nav-item-default",
          )}
          onClick={onOpenMenu}
          aria-label="Abrir menú completo"
          aria-haspopup="dialog"
        >
          <Menu className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="max-w-full truncate px-0.5 text-[10px] leading-tight">Más</span>
        </button>
      </div>
    </nav>
  );
}
