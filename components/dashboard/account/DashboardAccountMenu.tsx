"use client";

import { UserRound } from "lucide-react";
import { cn } from "@/lib/cn";

type NavLinkClassFn = (active: boolean, collapsed: boolean) => string;

interface DashboardAccountMenuProps {
  expanded: boolean;
  active: boolean;
  navLinkClass: NavLinkClassFn;
  onOpenAccountSettings: () => void;
}

export function DashboardAccountMenu({
  expanded,
  active,
  navLinkClass,
  onOpenAccountSettings,
}: DashboardAccountMenuProps) {
  const collapsed = !expanded;

  return (
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
  );
}
