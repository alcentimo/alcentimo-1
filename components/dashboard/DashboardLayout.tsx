"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Sparkles,
  Store,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { ProductLimitBanner } from "@/components/dashboard/ProductLimitBanner";
import { DASHBOARD_PLANS_HREF, type ProductLimitCheck } from "@/src/config/plans";

interface DashboardLayoutProps {
  children: React.ReactNode;
  storeName: string | null;
  catalogUrl: string | null;
  userEmail: string | null;
  planName?: string | null;
  productLimit?: ProductLimitCheck | null;
}

/** Rutas de auth/recuperación sin menú lateral ni chrome del panel. */
const STANDALONE_AUTH_PATHS = [
  "/dashboard/restablecer-contrasena",
  "/dashboard/recuperar-contrasena",
] as const;

function isStandaloneAuthPath(pathname: string): boolean {
  return STANDALONE_AUTH_PATHS.some((path) => pathname === path);
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
  match?: (pathname: string) => boolean;
}

function buildNavItems(catalogUrl: string | null): NavItem[] {
  return [
    {
      href: "/dashboard",
      label: "Inicio",
      icon: LayoutDashboard,
      match: (p) => p === "/dashboard",
    },
    {
      href: "/dashboard/inventario",
      label: "Inventario",
      icon: Package,
      match: (p) =>
        p.startsWith("/dashboard/inventario") ||
        p.startsWith("/dashboard/productos"),
    },
    {
      href: "/dashboard/ventas",
      label: "Ventas",
      icon: ShoppingCart,
      match: (p) => p.startsWith("/dashboard/ventas"),
    },
    {
      href: catalogUrl ?? "#",
      label: "Mi Catálogo",
      icon: Store,
      external: Boolean(catalogUrl),
      match: () => false,
    },
    {
      href: "/dashboard/ajustes",
      label: "Ajustes",
      icon: Settings,
      match: (p) => p.startsWith("/dashboard/ajustes"),
    },
    {
      href: DASHBOARD_PLANS_HREF,
      label: "Planes",
      icon: Sparkles,
      match: (p) => p.startsWith("/dashboard/planes"),
    },
  ];
}

function navLinkClass(active: boolean) {
  return [
    "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
    active
      ? "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300"
      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100",
  ].join(" ");
}

export function DashboardLayout({
  children,
  storeName,
  catalogUrl,
  userEmail,
  planName = null,
  productLimit = null,
}: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navItems = buildNavItems(catalogUrl);

  function closeSidebar() {
    setSidebarOpen(false);
  }

  useEffect(() => {
    if (!sidebarOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSidebarOpen(false);
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

  function isActive(item: NavItem) {
    return item.match?.(pathname) ?? pathname === item.href;
  }

  if (isStandaloneAuthPath(pathname)) {
    return (
      <div className="relative min-h-dvh bg-zinc-50 dark:bg-zinc-950">{children}</div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-zinc-900/40 backdrop-blur-[2px] lg:hidden"
          onClick={closeSidebar}
          aria-label="Cerrar menú"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 flex-col border-r border-zinc-200 bg-white transition-transform duration-200 ease-out dark:border-zinc-800 dark:bg-zinc-950 lg:static lg:z-auto lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0 shadow-xl" : "-translate-x-full lg:shadow-none"
        }`}
        aria-label="Barra lateral del panel"
      >
        <div className="border-b border-zinc-200 px-5 py-5 dark:border-zinc-800">
          <BrandLogo
            href="/dashboard"
            subtitle={storeName ?? "Panel"}
          />
        </div>

        <nav
          className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4"
          aria-label="Navegación principal"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            const className = navLinkClass(active);

            if (item.external && item.href !== "#") {
              return (
                <a
                  key={item.label}
                  href={item.href}
                  {...(item.href.startsWith("http") || item.href.startsWith("/#")
                    ? {}
                    : { target: "_blank", rel: "noopener noreferrer" })}
                  className={className}
                  onClick={closeSidebar}
                >
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.href.startsWith("/#") ? null : (
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden="true" />
                  )}
                </a>
              );
            }

            if (!item.external) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={className}
                  onClick={closeSidebar}
                >
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            }

            return (
              <span
                key={item.label}
                className={`${className} cursor-not-allowed opacity-40`}
                title="Crea tu tienda primero"
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </span>
            );
          })}
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
            href={DASHBOARD_PLANS_HREF}
            className={`${navLinkClass(pathname.startsWith("/dashboard/planes"))} mb-2`}
            onClick={closeSidebar}
          >
            <Sparkles className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>Ver planes</span>
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className={navLinkClass(false)}
          >
            <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
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

        <main className="flex-1 overflow-y-auto p-6 safe-area-inset lg:p-8">
          {productLimit && <ProductLimitBanner productLimit={productLimit} />}
          {children}
        </main>
      </div>
    </div>
  );
}
