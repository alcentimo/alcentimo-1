"use client";

import Link from "next/link";
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
  canUpgradeToBusiness?: boolean;
}

function isStandaloneAuthPath(pathname: string): boolean {
  return (
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
        canUpgradeToBusiness={canUpgradeToBusiness}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="dashboard-header flex h-14 shrink-0 items-center justify-between gap-3 px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="touch-target rounded-xl text-zinc-700 lg:hidden dark:text-zinc-300"
              aria-label={locale?.t("nav.openMenu") ?? "Abrir menú"}
            >
              <Menu className="h-5 w-5" />
            </button>
            <BrandLogo
              href="/dashboard/catalogo"
              size="sm"
              subtitle={storeName ?? undefined}
              className="lg:hidden"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <DashboardPreferenceControls variant="compact" />
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

        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5 safe-area-inset sm:p-7 lg:p-9">
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
