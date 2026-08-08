"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { OrderNotificationsProvider } from "@/components/dashboard/notifications/OrderNotificationsProvider";
import { CountryProvider } from "@/components/providers/CountryProvider";
import { UiPreferencesProvider } from "@/components/providers/UiPreferencesProvider";
import {
  fetchDashboardShellData,
  type DashboardShellData,
} from "@/lib/dashboard/fetch-dashboard-shell-data";
import { DASHBOARD_SHELL_REFRESH_EVENT } from "@/lib/dashboard/shell-refresh";
import { defaultStoreSettingsConfig } from "@/lib/store-settings/defaults";
import type { AccountSnapshot } from "@/lib/account/types";

const defaultPrefs = defaultStoreSettingsConfig().interfacePreferences;

type ShellOk = Extract<DashboardShellData, { ok: true }>;

/**
 * Chrome del dashboard sin bloqueo SSR: pinta al instante y completa
 * sesión / tasa / preferencias en el cliente.
 */
export function DashboardSessionShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [shell, setShell] = useState<ShellOk | null>(null);

  const refreshShell = useCallback(() => {
    void fetchDashboardShellData().then((result) => {
      if (!result.ok) return;
      setShell(result);
    });
  }, []);

  useEffect(() => {
    refreshShell();
  }, [refreshShell, pathname]);

  useEffect(() => {
    function onFocus() {
      refreshShell();
    }
    function onVisibility() {
      if (document.visibilityState === "visible") refreshShell();
    }
    function onShellRefresh() {
      refreshShell();
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener(DASHBOARD_SHELL_REFRESH_EVENT, onShellRefresh);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(DASHBOARD_SHELL_REFRESH_EVENT, onShellRefresh);
    };
  }, [refreshShell]);

  const accountSnapshot: AccountSnapshot | null = shell?.accountSnapshot ?? null;

  return (
    <UiPreferencesProvider
      initialPreferences={shell?.interfacePreferences ?? defaultPrefs}
    >
      <CountryProvider country={shell?.storeCountry ?? null}>
        <OrderNotificationsProvider storeId={shell?.storeId ?? null}>
          <DashboardLayout
            storeName={shell?.storeName ?? null}
            userEmail={shell?.userEmail ?? null}
            planName={shell?.planName ?? null}
            subscriptionStatus={shell?.subscriptionStatus ?? "none"}
            trialActive={shell?.trialActive ?? false}
            trialEligible={shell?.trialEligible ?? false}
            trialPhase={shell?.trialPhase ?? "none"}
            trialEndsAt={shell?.trialEndsAt ?? null}
            trialGraceEndsAt={shell?.trialGraceEndsAt ?? null}
            proTrialSetup={shell?.proTrialSetup ?? null}
            proTrialProductCount={shell?.proTrialProductCount ?? 0}
            exchangeRate={shell?.exchangeRate ?? null}
            exchangeRateUpdatedAt={shell?.exchangeRateUpdatedAt ?? null}
            isSupportAdmin={shell?.isSupportAdmin ?? false}
            isStoreOwner={shell?.isStoreOwner ?? false}
            storeRole={shell?.storeRole ?? null}
            canUpgradeToBusiness={shell?.canUpgradeToBusiness ?? false}
            accountSnapshot={accountSnapshot}
          >
            {children}
          </DashboardLayout>
        </OrderNotificationsProvider>
      </CountryProvider>
    </UiPreferencesProvider>
  );
}
