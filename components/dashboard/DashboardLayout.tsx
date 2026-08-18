"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Menu } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardQuickUtilities } from "@/components/dashboard/DashboardQuickUtilities";
import { DashboardExchangeRateBadge } from "@/components/dashboard/DashboardExchangeRateBadge";
import { DashboardViewKeepAlive } from "@/components/dashboard/DashboardViewKeepAlive";
import { DashboardRouteVisitTracker } from "@/components/dashboard/DashboardRouteVisitTracker";
import { AccountSettingsSheet } from "@/components/dashboard/account/AccountSettingsSheet";
import { useOptionalLocale } from "@/components/providers/UiPreferencesProvider";
import type { DashboardStoreRole } from "@/lib/team/permissions";
import type { AccountSnapshot } from "@/lib/account/types";
import type { SubscriptionStatus } from "@/lib/plans/plan-activation";
import type { ProTrialPhase } from "@/lib/plans/trial";
import {
  BRAND_LOGO_HEIGHT,
  BRAND_LOGO_PATH,
  BRAND_LOGO_WIDTH,
} from "@/lib/brand/assets";

const DASHBOARD_HOME_HREF = "/dashboard/catalogo";

interface DashboardLayoutProps {
  children: React.ReactNode;
  storeName: string | null;
  userEmail: string | null;
  planName?: string | null;
  subscriptionStatus?: SubscriptionStatus | null;
  trialActive?: boolean;
  trialPhase?: ProTrialPhase;
  trialEndsAt?: string | null;
  trialGraceEndsAt?: string | null;
  pendingOrdersCount?: number;
  exchangeRate?: number | null;
  exchangeRateUpdatedAt?: string | null;
  isSupportAdmin?: boolean;
  isStoreOwner?: boolean;
  storeRole?: DashboardStoreRole | null;
  canUpgradeToBusiness?: boolean;
  accountSnapshot?: AccountSnapshot | null;
}

/** Rutas de auth sin chrome del panel (login, invitación, recuperar clave). */
export function isStandaloneAuthPath(pathname: string): boolean {
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
  pendingOrdersCount = 0,
  exchangeRate = null,
  exchangeRateUpdatedAt = null,
  isSupportAdmin = false,
  storeRole = null,
  accountSnapshot = null,
}: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [accountSheetTab, setAccountSheetTab] = useState<string | undefined>();
  const [accountPrefetchToken, setAccountPrefetchToken] = useState(0);
  const locale = useOptionalLocale();
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

  function prefetchAccountSettings() {
    setAccountPrefetchToken((token) => token + 1);
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
    <div className="dashboard-shell flex h-dvh max-w-full overflow-hidden">
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
        pendingOrdersCount={pendingOrdersCount}
        mobileOpen={sidebarOpen}
        immersiveHidden={false}
        onCloseMobile={closeSidebar}
        onLogout={() => void handleLogout()}
        onOpenAccountSettings={() => openAccountSettings()}
        onPrefetchAccountSettings={prefetchAccountSettings}
        accountSettingsActive={accountSheetOpen || Boolean(accountQueryParam)}
        isSupportAdmin={isSupportAdmin}
        storeRole={storeRole}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="dashboard-header shrink-0">
          <div className="flex h-14 items-center gap-2.5 px-3 sm:gap-3 sm:px-4 lg:px-6">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="touch-target shrink-0 rounded-xl text-zinc-700 lg:hidden dark:text-zinc-300"
              aria-label={locale?.t("nav.openMenu") ?? "Abrir menú"}
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link
              href={DASHBOARD_HOME_HREF}
              className="dashboard-header-brand inline-flex min-w-0 flex-1 items-center border-0 bg-transparent shadow-none outline-none lg:hidden"
              aria-label="Alcentimo"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={BRAND_LOGO_PATH}
                width={BRAND_LOGO_WIDTH}
                height={BRAND_LOGO_HEIGHT}
                alt="Alcentimo"
                className="dashboard-header-brand-img block h-8 w-auto max-w-full shrink-0 border-0 bg-transparent object-contain object-left shadow-none outline-none"
                decoding="async"
              />
            </Link>

            <div className="dashboard-header-actions hidden min-w-0 items-center lg:flex">
              <DashboardQuickUtilities
                exchangeRate={exchangeRate}
                exchangeRateUpdatedAt={exchangeRateUpdatedAt}
              />
            </div>
          </div>

          <div className="dashboard-header-rate-strip border-t border-zinc-200/70 px-3 py-1.5 lg:hidden dark:border-zinc-800/70">
            <DashboardExchangeRateBadge
              rate={exchangeRate}
              updatedAt={exchangeRateUpdatedAt}
              variant="compact"
            />
          </div>
        </header>

        <main className="dashboard-main flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-hidden overflow-y-auto p-4 safe-area-inset sm:p-7 lg:p-9">
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
        showBillingTab={false}
        canUpgradeToBusiness={false}
        onTabChange={handleAccountTabChange}
        initialAccount={accountSnapshot}
        prefetchToken={accountPrefetchToken}
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
