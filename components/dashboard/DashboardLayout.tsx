"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Menu } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardQuickUtilities } from "@/components/dashboard/DashboardQuickUtilities";
import { DashboardViewKeepAlive } from "@/components/dashboard/DashboardViewKeepAlive";
import { DashboardRouteVisitTracker } from "@/components/dashboard/DashboardRouteVisitTracker";
import { AccountSettingsSheet } from "@/components/dashboard/account/AccountSettingsSheet";
import { useOptionalLocale } from "@/components/providers/UiPreferencesProvider";
import type { DashboardStoreRole } from "@/lib/team/permissions";
import { isDashboardStoreOwner } from "@/lib/team/permissions";

interface DashboardLayoutProps {
  children: React.ReactNode;
  storeName: string | null;
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
  exchangeRate = null,
  exchangeRateUpdatedAt = null,
  exchangeRateStale = false,
  isSupportAdmin = false,
  storeRole = null,
  canUpgradeToBusiness = false,
}: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [accountSheetTab, setAccountSheetTab] = useState<string | undefined>();
  const locale = useOptionalLocale();
  const showOwnerBillingLinks = isDashboardStoreOwner(storeRole);
  const accountQueryParam = searchParams.get("account");

  function closeSidebar() {
    setSidebarOpen(false);
  }

  function syncAccountQueryParam(tab: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab) {
      params.set("account", tab);
    } else {
      params.delete("account");
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function openAccountSettings(tab?: string) {
    const nextTab = tab ?? "perfil";
    setAccountSheetTab(nextTab);
    setAccountSheetOpen(true);
    closeSidebar();
    syncAccountQueryParam(nextTab);
  }

  function closeAccountSettings() {
    setAccountSheetOpen(false);
    setAccountSheetTab(undefined);
    if (accountQueryParam) {
      syncAccountQueryParam(null);
    }
  }

  function handleAccountTabChange(tab: string) {
    setAccountSheetTab(tab);
    syncAccountQueryParam(tab);
  }

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!accountQueryParam) return;
    setAccountSheetTab(accountQueryParam);
    setAccountSheetOpen(true);
  }, [accountQueryParam]);

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
        mobileOpen={sidebarOpen}
        immersiveHidden={false}
        onCloseMobile={closeSidebar}
        onLogout={() => void handleLogout()}
        onOpenAccountSettings={() => openAccountSettings()}
        accountSettingsActive={accountSheetOpen || Boolean(accountQueryParam)}
        isSupportAdmin={isSupportAdmin}
        storeRole={storeRole}
        exchangeRate={exchangeRate}
        exchangeRateUpdatedAt={exchangeRateUpdatedAt}
        exchangeRateStale={exchangeRateStale}
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
          </div>
          <div className="dashboard-header-actions flex shrink-0 items-center">
            <DashboardQuickUtilities
              exchangeRate={exchangeRate}
              exchangeRateUpdatedAt={exchangeRateUpdatedAt}
              exchangeRateStale={exchangeRateStale}
            />
          </div>
        </header>

        <main className="dashboard-main flex min-h-0 flex-1 flex-col overflow-y-auto p-4 safe-area-inset sm:p-7 lg:p-9">
          <DashboardRouteVisitTracker pathname={pathname} />
          <DashboardViewKeepAlive pathname={pathname}>{children}</DashboardViewKeepAlive>
        </main>
      </div>

      <AccountSettingsSheet
        open={accountSheetOpen}
        onOpenChange={(open) => {
          if (open) {
            setAccountSheetOpen(true);
          } else {
            closeAccountSettings();
          }
        }}
        initialTab={accountSheetTab}
        showBillingTab={showOwnerBillingLinks}
        canUpgradeToBusiness={canUpgradeToBusiness}
        onTabChange={handleAccountTabChange}
      />
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
    <Suspense fallback={null}>
      <DashboardShell {...props} />
    </Suspense>
  );
}
