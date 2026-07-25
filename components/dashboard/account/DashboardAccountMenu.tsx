"use client";

import { LogOut, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";

type NavLinkClassFn = (active: boolean, collapsed: boolean) => string;

interface DashboardAccountMenuProps {
  expanded: boolean;
  active: boolean;
  navLinkClass: NavLinkClassFn;
  onOpenAccountSettings: () => void;
  onLogout: () => void;
}

export function DashboardAccountMenu({
  expanded,
  active,
  navLinkClass,
  onOpenAccountSettings,
  onLogout,
}: DashboardAccountMenuProps) {
  const collapsed = !expanded;

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        className={cn(navLinkClass(active, collapsed), "touch-manipulation")}
        aria-haspopup="dialog"
        aria-expanded={active}
        onClick={onOpenAccountSettings}
        title={collapsed ? "Perfil y cuenta" : undefined}
      >
        <UserRound
          className={cn("shrink-0", collapsed ? "h-[18px] w-[18px]" : "h-4 w-4")}
          strokeWidth={active ? 2 : 1.75}
          aria-hidden="true"
        />
        {!collapsed && <span className="truncate">Perfil y cuenta</span>}
      </button>

      <button
        type="button"
        className={cn(
          navLinkClass(false, collapsed),
          "touch-manipulation text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300",
        )}
        onClick={onLogout}
        title={collapsed ? "Cerrar sesión" : undefined}
      >
        <LogOut
          className={cn("shrink-0", collapsed ? "h-[18px] w-[18px]" : "h-4 w-4")}
          strokeWidth={1.75}
          aria-hidden="true"
        />
        {!collapsed && <span className="truncate">Cerrar sesión</span>}
      </button>
    </div>
  );
}
