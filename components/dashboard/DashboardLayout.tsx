"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardExchangeRateBadge } from "@/components/dashboard/DashboardExchangeRateBadge";
import { DashboardPreferenceControls } from "@/components/dashboard/DashboardPreferenceControls";
import { PublicCatalogQuickLink } from "@/components/dashboard/PublicCatalogQuickLink";
import { DashboardViewKeepAlive } from "@/components/dashboard/DashboardViewKeepAlive";
import { DashboardRouteVisitTracker } from "@/components/dashboard/DashboardRouteVisitTracker";
import { useOptionalLocale } from "@/components/providers/UiPreferencesProvider";
import type { DashboardStoreRole } from "@/lib/team/permissions";
import { isDashboardStoreOwner } from "@/lib/team/permissions";

interface DashboardLayoutProps {
  children: React.ReactNode;
  storeName: string | null;
  storeSlug: string | null;
  customDomain?: string | null;
  customDomainVerified?: boolean;
  userEmail: string | null;
  planName?: string | null;
  exchangeRate?: number | null;
  exchangeRateUpdatedAt?: string | null;
  exchangeRateStale?: boolean;
  isSupportAdmin?: boolean;
  isStoreOwner?: boolean;
  storeRole?: DashboardStoreRole | null;
  canUpgradeToBusiness?: boolean;
}

function isStandaloneAuthPath(pathname: string): boolean {
  return (
    pathname === "/dashboard/login" ||
    pathname === "/dashboard/invitacion" ||
    pathname === "/dashboard/recuperar-contrasena" ||
    pathname.startsWith("/dashboard/restablecer-contrasena")
  );
}

function DashboardShell({
  children,
  storeName,
  storeSlug,
  customDomain = null,
  customDomainVerified = false,
  userEmail,
  planName = null,
  exchangeRate = null,
  exchangeRateUpdatedAt = null,
  exchangeRateStale = false,
  isSupportAdmin = false,
  isStoreOwner = false,
  storeRole = null,
  canUpgradeToBusiness = false,
}: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const locale = useOptionalLocale();

  function closeSidebar() {
    setSidebarOpen(false);
  }

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSidebarOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [sidebarOpen]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/dashboard/login");
    router.refresh();
  }

  return (
    <div className="dashboard-shell flex h-dvh overflow-hidden">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-zinc-900/40 backdrop-blur-[2px] lg:hidden"
          onClick={closeSidebar}
          aria-label={locale?.t("nav.closeMenu") ?? "Cerrar menú"}
        />
      )}

      <DashboardSidebar
        pathname={pathname}
        storeName={storeName}
        userEmail={userEmail}
        planName={planName}
        mobileOpen={sidebarOpen}
        immersiveHidden={false}
        onCloseMobile={closeSidebar}
        onLogout={() => void handleLogout()}
        isSupportAdmin={isSupportAdmin}
        isStoreOwner={isStoreOwner}
        storeRole={storeRole}
        canUpgradeToBusiness={canUpgradeToBusiness && isDashboardStoreOwner(storeRole)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="dashboard-header flex h-14 shrink-0 items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="touch-target shrink-0 rounded-xl text-zinc-700 lg:hidden dark:text-zinc-300"
              aria-label={locale?.t("nav.openMenu") ?? "Abrir menú"}
            >
              <Menu className="h-5 w-5" />
            </button>
            <BrandLogo
              href="/dashboard/catalogo"
              size="md"
              responsive
              showName={false}
              subtitle={storeName ?? undefined}
              className="brand-logo-header-mobile min-w-0 lg:hidden"
            />
          </div>
          <div className="dashboard-header-actions flex shrink-0 items-center gap-1 sm:gap-2">
            <DashboardPreferenceControls variant="compact" className="hidden sm:flex" />
            <DashboardExchangeRateBadge
              rate={exchangeRate}
              updatedAt={exchangeRateUpdatedAt}
              stale={exchangeRateStale}
            />
            <PublicCatalogQuickLink
              storeSlug={storeSlug}
              customDomain={customDomain}
              customDomainVerified={customDomainVerified}
              variant="header"
            />
          </div>
        </header>

        <main className="dashboard-main flex min-h-0 flex-1 flex-col overflow-y-auto p-4 safe-area-inset sm:p-7 lg:p-9">
          <DashboardRouteVisitTracker pathname={pathname} />
          <DashboardViewKeepAlive pathname={pathname}>{children}</DashboardViewKeepAlive>
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

  return <DashboardShell {...props} />;
}
