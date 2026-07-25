"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  CreditCard,
  LogOut,
  Rocket,
  Shield,
  UserRound,
} from "lucide-react";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DASHBOARD_PLANS_HREF } from "@/src/config/plans";
import { cn } from "@/lib/cn";

function initialsFromEmail(email: string | null | undefined): string {
  const value = email?.trim();
  if (!value) return "U";
  const local = value.split("@")[0] ?? value;
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

function AccountMenuLink({
  href,
  children,
  onNavigate,
  active = false,
  className,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition touch-manipulation active:scale-[0.99]",
        active
          ? "bg-emerald-50 font-medium text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
          : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900",
        className,
      )}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

interface DashboardAccountMenuProps {
  userEmail: string | null;
  planName?: string | null;
  expanded: boolean;
  /** En el drawer móvil: lista inline en vez de dropdown (mejor táctil). */
  inlinePanel?: boolean;
  showOwnerBillingLinks: boolean;
  canUpgradeToBusiness: boolean;
  onLogout: () => void;
  onNavigate: () => void;
}

export function DashboardAccountMenu({
  userEmail,
  planName = null,
  expanded,
  inlinePanel = false,
  showOwnerBillingLinks,
  canUpgradeToBusiness,
  onLogout,
  onNavigate,
}: DashboardAccountMenuProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const panelId = useId();
  const initials = initialsFromEmail(userEmail);
  const accountActive = pathname.startsWith("/dashboard/cuenta");
  const isSecurityTab = accountActive && searchParams.get("tab") === "seguridad";
  const isProfileTab = accountActive && !isSecurityTab;
  const [panelOpen, setPanelOpen] = useState(inlinePanel);

  useEffect(() => {
    if (inlinePanel) setPanelOpen(true);
  }, [inlinePanel]);

  const accountLinks = (
    <>
      <AccountMenuLink
        href="/dashboard/cuenta"
        active={isProfileTab}
        onNavigate={onNavigate}
      >
        <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
        Perfil y cuenta
      </AccountMenuLink>

      <AccountMenuLink
        href="/dashboard/cuenta?tab=seguridad"
        active={isSecurityTab}
        onNavigate={onNavigate}
      >
        <Shield className="h-4 w-4 shrink-0" aria-hidden="true" />
        Seguridad
      </AccountMenuLink>

      {showOwnerBillingLinks ? (
        <>
          <AccountMenuLink href="/activar" onNavigate={onNavigate}>
            <Rocket className="h-4 w-4 shrink-0" aria-hidden="true" />
            Activar cuenta
          </AccountMenuLink>

          {canUpgradeToBusiness ? (
            <AccountMenuLink href="/dashboard/upgrade" onNavigate={onNavigate}>
              <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              Upgrade a Business
            </AccountMenuLink>
          ) : null}

          <AccountMenuLink href={DASHBOARD_PLANS_HREF} onNavigate={onNavigate}>
            <CreditCard className="h-4 w-4 shrink-0" aria-hidden="true" />
            Planes y facturación
          </AccountMenuLink>
        </>
      ) : null}

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onNavigate();
          onLogout();
        }}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-red-600 transition touch-manipulation hover:bg-red-50 active:scale-[0.99] dark:text-red-400 dark:hover:bg-red-950/30"
      >
        <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
        Cerrar sesión
      </button>
    </>
  );

  if (inlinePanel && expanded) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/40">
        <button
          type="button"
          className="flex w-full items-center gap-3 px-3 py-3 text-left touch-manipulation"
          aria-expanded={panelOpen}
          aria-controls={panelId}
          onClick={() => setPanelOpen((value) => !value)}
        >
          <span
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white"
            aria-hidden="true"
          >
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Tu cuenta
            </span>
            <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {userEmail ?? "Mi cuenta"}
            </span>
            {planName ? (
              <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                {planName}
              </span>
            ) : null}
          </span>
          {panelOpen ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
          )}
        </button>

        {panelOpen ? (
          <div
            id={panelId}
            className="space-y-0.5 border-t border-zinc-200 px-1.5 py-1.5 dark:border-zinc-800"
            role="menu"
            aria-label="Opciones de cuenta"
          >
            {accountLinks}
          </div>
        ) : null}
      </div>
    );
  }

  const trigger = (
    <button
      type="button"
      className={cn(
        "flex w-full items-center rounded-lg border transition-colors touch-manipulation",
        accountActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
          : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:hover:bg-zinc-900",
        expanded ? "gap-3 px-3 py-2.5" : "justify-center p-2",
      )}
      aria-label="Menú de cuenta"
      title={expanded ? undefined : userEmail ?? "Cuenta"}
    >
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-600 font-semibold text-white",
          expanded ? "h-9 w-9 text-sm" : "h-8 w-8 text-xs",
        )}
        aria-hidden="true"
      >
        {initials}
      </span>
      {expanded ? (
        <>
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-medium">
              {userEmail ?? "Mi cuenta"}
            </span>
            {planName ? (
              <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                {planName}
              </span>
            ) : null}
          </span>
          <ChevronUp className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
        </>
      ) : null}
    </button>
  );

  return (
    <DropdownMenu
      trigger={trigger}
      align="start"
      className="w-full"
      menuClassName="bottom-full top-auto mb-1 mt-0 w-full min-w-0"
    >
      {(close) => (
        <>
          <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Tu cuenta
            </p>
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {userEmail ?? "Cuenta"}
            </p>
            {planName ? (
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {planName}
              </p>
            ) : null}
          </div>

          <AccountMenuLink
            href="/dashboard/cuenta"
            className="rounded-none"
            active={isProfileTab}
            onNavigate={() => {
              close();
              onNavigate();
            }}
          >
            <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
            Perfil y cuenta
          </AccountMenuLink>

          <AccountMenuLink
            href="/dashboard/cuenta?tab=seguridad"
            className="rounded-none"
            active={isSecurityTab}
            onNavigate={() => {
              close();
              onNavigate();
            }}
          >
            <Shield className="h-4 w-4 shrink-0" aria-hidden="true" />
            Seguridad
          </AccountMenuLink>

          {showOwnerBillingLinks ? (
            <>
              <AccountMenuLink
                href="/activar"
                className="rounded-none"
                onNavigate={() => {
                  close();
                  onNavigate();
                }}
              >
                <Rocket className="h-4 w-4 shrink-0" aria-hidden="true" />
                Activar cuenta
              </AccountMenuLink>

              {canUpgradeToBusiness ? (
                <AccountMenuLink
                  href="/dashboard/upgrade"
                  className="rounded-none"
                  onNavigate={() => {
                    close();
                    onNavigate();
                  }}
                >
                  <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Upgrade a Business
                </AccountMenuLink>
              ) : null}

              <AccountMenuLink
                href={DASHBOARD_PLANS_HREF}
                className="rounded-none"
                onNavigate={() => {
                  close();
                  onNavigate();
                }}
              >
                <CreditCard className="h-4 w-4 shrink-0" aria-hidden="true" />
                Planes y facturación
              </AccountMenuLink>
            </>
          ) : null}

          <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />

          <DropdownMenuItem
            destructive
            onClick={() => {
              close();
              onLogout();
            }}
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            Cerrar sesión
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenu>
  );
}
