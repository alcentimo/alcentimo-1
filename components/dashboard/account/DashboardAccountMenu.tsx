"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
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
}: {
  href: string;
  children: React.ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
    >
      {children}
    </Link>
  );
}

interface DashboardAccountMenuProps {
  userEmail: string | null;
  planName?: string | null;
  expanded: boolean;
  showOwnerBillingLinks: boolean;
  canUpgradeToBusiness: boolean;
  onLogout: () => void;
  onNavigate: () => void;
}

export function DashboardAccountMenu({
  userEmail,
  planName = null,
  expanded,
  showOwnerBillingLinks,
  canUpgradeToBusiness,
  onLogout,
  onNavigate,
}: DashboardAccountMenuProps) {
  const pathname = usePathname();
  const initials = initialsFromEmail(userEmail);
  const accountActive = pathname.startsWith("/dashboard/cuenta");

  const trigger = (
    <button
      type="button"
      className={cn(
        "flex w-full items-center rounded-lg border transition-colors",
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
    <DropdownMenu trigger={trigger} align="start">
      {(close) => (
        <>
          <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
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
