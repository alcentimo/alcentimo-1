"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  CreditCard,
  LogOut,
  Rocket,
  Shield,
  UserRound,
  type LucideIcon,
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

type NavLinkClassFn = (active: boolean, collapsed: boolean) => string;

interface DashboardAccountMenuProps {
  userEmail: string | null;
  planName?: string | null;
  expanded: boolean;
  navLinkClass: NavLinkClassFn;
  showOwnerBillingLinks: boolean;
  canUpgradeToBusiness: boolean;
  onLogout: () => void;
  onNavigate: () => void;
}

function AccountNavLink({
  href,
  icon: Icon,
  label,
  active,
  collapsed,
  nested = false,
  navLinkClass,
  onNavigate,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
  collapsed: boolean;
  nested?: boolean;
  navLinkClass: NavLinkClassFn;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      prefetch={true}
      className={cn(
        navLinkClass(active, collapsed),
        nested && !collapsed && "ml-2 min-h-9 gap-2.5 py-1.5 pl-2 text-[13px]",
      )}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
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

function AccountNavButton({
  icon: Icon,
  label,
  collapsed,
  nested = false,
  navLinkClass,
  destructive = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  collapsed: boolean;
  nested?: boolean;
  navLinkClass: NavLinkClassFn;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        navLinkClass(false, collapsed),
        nested && !collapsed && "ml-2 min-h-9 gap-2.5 py-1.5 pl-2 text-[13px]",
        destructive &&
          "text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300",
      )}
      onClick={onClick}
      title={collapsed ? label : undefined}
    >
      <Icon
        className={cn("shrink-0", collapsed ? "h-[18px] w-[18px]" : "h-4 w-4")}
        strokeWidth={1.75}
        aria-hidden="true"
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

export function DashboardAccountMenu({
  userEmail,
  planName = null,
  expanded,
  navLinkClass,
  showOwnerBillingLinks,
  canUpgradeToBusiness,
  onLogout,
  onNavigate,
}: DashboardAccountMenuProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const collapsed = !expanded;
  const initials = initialsFromEmail(userEmail);

  const accountActive = pathname.startsWith("/dashboard/cuenta");
  const isSecurityTab = accountActive && searchParams.get("tab") === "seguridad";
  const isProfileTab = accountActive && !isSecurityTab;
  const billingActive =
    pathname.startsWith("/activar") ||
    pathname.startsWith("/dashboard/upgrade") ||
    pathname.startsWith("/dashboard/planes");
  const sectionActive = accountActive || billingActive;

  const [open, setOpen] = useState(sectionActive);

  useEffect(() => {
    if (sectionActive) setOpen(true);
  }, [sectionActive]);

  useEffect(() => {
    if (expanded) return;
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

  function renderSubLinks(nested = true): ReactNode {
    return (
      <>
        <AccountNavLink
          href="/dashboard/cuenta"
          icon={UserRound}
          label="Perfil y cuenta"
          active={isProfileTab}
          collapsed={collapsed}
          nested={nested}
          navLinkClass={navLinkClass}
          onNavigate={handleNavigate}
        />
        <AccountNavLink
          href="/dashboard/cuenta?tab=seguridad"
          icon={Shield}
          label="Seguridad"
          active={isSecurityTab}
          collapsed={collapsed}
          nested={nested}
          navLinkClass={navLinkClass}
          onNavigate={handleNavigate}
        />
        {showOwnerBillingLinks ? (
          <>
            <AccountNavLink
              href="/activar"
              icon={Rocket}
              label="Activar cuenta"
              active={pathname.startsWith("/activar")}
              collapsed={collapsed}
              nested={nested}
              navLinkClass={navLinkClass}
              onNavigate={handleNavigate}
            />
            {canUpgradeToBusiness ? (
              <AccountNavLink
                href="/dashboard/upgrade"
                icon={ArrowUpRight}
                label="Upgrade a Business"
                active={pathname.startsWith("/dashboard/upgrade")}
                collapsed={collapsed}
                nested={nested}
                navLinkClass={navLinkClass}
                onNavigate={handleNavigate}
              />
            ) : null}
            <AccountNavLink
              href={DASHBOARD_PLANS_HREF}
              icon={CreditCard}
              label="Planes y facturación"
              active={pathname.startsWith("/dashboard/planes")}
              collapsed={collapsed}
              nested={nested}
              navLinkClass={navLinkClass}
              onNavigate={handleNavigate}
            />
          </>
        ) : null}
        <AccountNavButton
          icon={LogOut}
          label="Cerrar sesión"
          collapsed={collapsed}
          nested={nested}
          navLinkClass={navLinkClass}
          destructive
          onClick={() => {
            handleNavigate();
            onLogout();
          }}
        />
      </>
    );
  }

  const triggerLabel = userEmail ?? "Mi cuenta";

  if (expanded) {
    return (
      <div className="space-y-0.5">
        <button
          type="button"
          className={cn(
            navLinkClass(sectionActive, false),
            "touch-manipulation",
          )}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          title={planName ? `${triggerLabel} · ${planName}` : triggerLabel}
        >
          <span
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-semibold text-white"
            aria-hidden="true"
          >
            {initials}
          </span>
          <span className="min-w-0 flex-1 truncate text-left">{triggerLabel}</span>
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
              className="space-y-0.5 border-l-2 border-zinc-200/80 pl-1 dark:border-zinc-800"
              role="group"
              aria-label="Opciones de cuenta"
            >
              {renderSubLinks(true)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sidebar colapsado: panel contenido dentro del ancho del rail (hacia arriba).
  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={cn(navLinkClass(sectionActive, true), "touch-manipulation")}
        aria-label="Menú de cuenta"
        aria-expanded={open}
        aria-controls={panelId}
        title={triggerLabel}
        onClick={() => setOpen((value) => !value)}
      >
        <span
          className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[8px] font-semibold text-white"
          aria-hidden="true"
        >
          {initials}
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          className="absolute inset-x-0 bottom-full z-50 mb-1 max-h-[min(70vh,20rem)] overflow-y-auto overscroll-contain rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
          role="menu"
          aria-label="Opciones de cuenta"
        >
          {renderSubLinks(false)}
        </div>
      ) : null}
    </div>
  );
}
