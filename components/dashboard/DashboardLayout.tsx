"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Menu, Rocket } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { PublicCatalogQuickLink } from "@/components/dashboard/PublicCatalogQuickLink";
import { DASHBOARD_PLANS_HREF } from "@/src/config/plans";
import {
  DASHBOARD_NAV_SECTIONS,
  isDashboardNavItemActive,
  type DashboardNavItem,
} from "@/src/config/dashboard-nav";
import { ImmersiveModeProvider, useImmersiveMode } from "@/components/inbox/ImmersiveModeProvider";

interface DashboardLayoutProps {
  children: React.ReactNode;
  storeName: string | null;
  storeSlug: string | null;
  userEmail: string | null;
  planName?: string | null;
}

function isStandaloneAuthPath(pathname: string): boolean {
  return (
    pathname === "/dashboard/recuperar-contrasena" ||
    pathname.startsWith("/dashboard/restablecer-contrasena")
  );
}

function isMensajesPath(pathname: string): boolean {
  return pathname.startsWith("/dashboard/mensajes");
}

function navLinkClass(active: boolean) {
  return [
    "flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
    active
      ? "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300"
      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100",
  ].join(" ");
}

function SidebarNavLink({
  item,
  active,
  onNavigate,
}: {
  item: DashboardNavItem;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={navLinkClass(active)}
      onClick={onNavigate}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function DashboardShell({
  children,
  storeName,
  storeSlug,
  userEmail,
  planName = null,
}: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isImmersive } = useImmersiveMode();
  const immersiveActive = isMensajesPath(pathname) && isImmersive;

  function closeSidebar() {
    setSidebarOpen(false);
  }

  useEffect(() => {
    if (!sidebarOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSidebarOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/dashboard/login");
    router.refresh();
  }

  return (
    <div
      className={`flex h-dvh overflow-hidden bg-zinc-100 dark:bg-zinc-950 ${
        immersiveActive ? "dashboard-shell--immersive" : ""
      }`}
    >
      {sidebarOpen && !immersiveActive && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-zinc-900/40 backdrop-blur-[2px] lg:hidden"
          onClick={closeSidebar}
          aria-label="Cerrar menú"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 flex-col border-r border-zinc-200 bg-white transition-transform duration-200 ease-out dark:border-zinc-800 dark:bg-zinc-950 lg:static lg:z-auto lg:translate-x-0 ${
          immersiveActive
            ? "-translate-x-full lg:hidden"
            : sidebarOpen
              ? "translate-x-0 shadow-xl"
              : "-translate-x-full lg:shadow-none"
        }`}
        aria-label="Barra lateral del panel"
        aria-hidden={immersiveActive}
      >
        <div className="border-b border-zinc-200 px-5 py-5 dark:border-zinc-800">
          <BrandLogo href="/dashboard" subtitle={storeName ?? "Panel"} />
        </div>

        <div className="border-b border-zinc-200 py-4 dark:border-zinc-800">
          <PublicCatalogQuickLink storeSlug={storeSlug} onNavigate={closeSidebar} />
        </div>

        <nav
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 py-4"
          aria-label="Navegación principal"
        >
          {DASHBOARD_NAV_SECTIONS.map((section) => (
            <div key={section.id}>
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {section.label}
              </p>
              <div className="mt-1 flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <SidebarNavLink
                    key={item.href}
                    item={item}
                    active={isDashboardNavItemActive(pathname, item)}
                    onNavigate={closeSidebar}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          {planName && (
            <p className="mb-1 truncate px-2 text-xs font-medium text-teal-700 dark:text-teal-400">
              {planName}
            </p>
          )}
          {userEmail && (
            <p className="mb-3 truncate px-2 text-xs text-zinc-500 dark:text-zinc-400">
              {userEmail}
            </p>
          )}
          <Link
            href="/activar"
            className={`${navLinkClass(pathname === "/activar")} mb-2`}
            onClick={closeSidebar}
          >
            <Rocket className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>Activar Cuenta</span>
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className={navLinkClass(false)}
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>
          <p className="mt-3 px-2 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
            <Link
              href={DASHBOARD_PLANS_HREF}
              className="hover:text-zinc-600 dark:hover:text-zinc-300"
              onClick={closeSidebar}
            >
              Planes
            </Link>
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {!immersiveActive && (
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 lg:hidden dark:border-zinc-800 dark:bg-zinc-950">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="touch-target rounded-xl text-zinc-700 dark:text-zinc-300"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
            <BrandLogo href="/dashboard" size="sm" subtitle={storeName ?? undefined} />
            <div className="w-11" aria-hidden="true" />
          </header>
        )}

        <main
          className={`flex min-h-0 flex-1 flex-col safe-area-inset ${
            isMensajesPath(pathname)
              ? "dashboard-main--mensajes overflow-hidden"
              : "overflow-y-auto p-4 sm:p-6 lg:p-8"
          } ${immersiveActive ? "dashboard-main--immersive" : ""}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export function DashboardLayout(props: DashboardLayoutProps) {
  const pathname = usePathname();

  if (isStandaloneAuthPath(pathname)) {
    return (
      <div className="relative min-h-dvh bg-zinc-50 dark:bg-zinc-950">{props.children}</div>
    );
  }

  return (
    <ImmersiveModeProvider>
      <DashboardShell {...props} />
    </ImmersiveModeProvider>
  );
}
