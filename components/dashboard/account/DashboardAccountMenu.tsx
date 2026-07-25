"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  CreditCard,
  LogOut,
  Rocket,
  Shield,
  UserRound,
} from "lucide-react";
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
}: {
  href: string;
  children: React.ReactNode;
  onNavigate: () => void;
  active?: boolean;
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
  const searchParams = useSearchParams();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const initials = initialsFromEmail(userEmail);
  const accountActive = pathname.startsWith("/dashboard/cuenta");
  const isSecurityTab = accountActive && searchParams.get("tab") === "seguridad";
  const isProfileTab = accountActive && !isSecurityTab;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Al colapsar/expandir el sidebar, cierra el panel para evitar estados raros.
    setOpen(false);
  }, [expanded]);

  useEffect(() => {
    if (!open || expanded) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, expanded]);

  function handleNavigate() {
    setOpen(false);
    onNavigate();
  }

  const accountLinks = (
    <>
      <AccountMenuLink
        href="/dashboard/cuenta"
        active={isProfileTab}
        onNavigate={handleNavigate}
      >
        <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
        Perfil y cuenta
      </AccountMenuLink>

      <AccountMenuLink
        href="/dashboard/cuenta?tab=seguridad"
        active={isSecurityTab}
        onNavigate={handleNavigate}
      >
        <Shield className="h-4 w-4 shrink-0" aria-hidden="true" />
        Seguridad
      </AccountMenuLink>

      {showOwnerBillingLinks ? (
        <>
          <AccountMenuLink href="/activar" onNavigate={handleNavigate}>
            <Rocket className="h-4 w-4 shrink-0" aria-hidden="true" />
            Activar cuenta
          </AccountMenuLink>

          {canUpgradeToBusiness ? (
            <AccountMenuLink href="/dashboard/upgrade" onNavigate={handleNavigate}>
              <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              Upgrade a Business
            </AccountMenuLink>
          ) : null}

          <AccountMenuLink href={DASHBOARD_PLANS_HREF} onNavigate={handleNavigate}>
            <CreditCard className="h-4 w-4 shrink-0" aria-hidden="true" />
            Planes y facturación
          </AccountMenuLink>
        </>
      ) : null}

      <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          handleNavigate();
          onLogout();
        }}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-red-600 transition touch-manipulation hover:bg-red-50 active:scale-[0.99] dark:text-red-400 dark:hover:bg-red-950/30"
      >
        <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
        Cerrar sesión
      </button>
    </>
  );

  // Sidebar expandido (PC o drawer móvil): acordeón en flujo, sin overlay.
  if (expanded) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-xl border bg-zinc-50/80 transition-colors dark:bg-zinc-900/40",
          open || accountActive
            ? "border-emerald-200 dark:border-emerald-900/50"
            : "border-zinc-200 dark:border-zinc-800",
        )}
      >
        <button
          type="button"
          className="flex w-full items-center gap-3 px-3 py-2.5 text-left touch-manipulation"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
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
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200",
              open && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>

        <div
          id={panelId}
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-out",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div
              className="max-h-56 space-y-0.5 overflow-y-auto overscroll-contain border-t border-zinc-200 px-1.5 py-1.5 dark:border-zinc-800"
              role="menu"
              aria-label="Opciones de cuenta"
            >
              {accountLinks}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sidebar colapsado: flyout a la derecha, contenido dentro de la tarjeta.
  return (
    <div ref={rootRef} className="relative flex justify-center">
      <button
        type="button"
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-colors touch-manipulation",
          open || accountActive
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30"
            : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-900",
        )}
        aria-label="Menú de cuenta"
        aria-expanded={open}
        aria-controls={panelId}
        title={userEmail ?? "Cuenta"}
        onClick={() => setOpen((value) => !value)}
      >
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white"
          aria-hidden="true"
        >
          {initials}
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          className="absolute bottom-0 left-full z-50 ml-2 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
          role="menu"
          aria-label="Opciones de cuenta"
        >
          <div className="border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
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
          <div className="max-h-64 space-y-0.5 overflow-y-auto overscroll-contain px-1.5 py-1.5">
            {accountLinks}
          </div>
        </div>
      ) : null}
    </div>
  );
}
