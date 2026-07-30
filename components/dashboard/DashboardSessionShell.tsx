"use client";

import { useEffect, useState, type ReactNode } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { BcvSyncAlertBanner } from "@/components/dashboard/BcvSyncAlertBanner";
import { CountryProvider } from "@/components/providers/CountryProvider";
import { UiPreferencesProvider } from "@/components/providers/UiPreferencesProvider";
import {
  fetchDashboardShellData,
  type DashboardShellData,
} from "@/lib/dashboard/fetch-dashboard-shell-data";
import { defaultStoreSettingsConfig } from "@/lib/store-settings/defaults";

const defaultPrefs = defaultStoreSettingsConfig().interfacePreferences;

/**
 * Chrome del dashboard sin bloqueo SSR: pinta al instante y completa
 * sesión / tasa / preferencias en el cliente.
 */
export function DashboardSessionShell({ children }: { children: ReactNode }) {
  const [shell, setShell] = useState<Extract<DashboardShellData, { ok: true }> | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    void fetchDashboardShellData().then((result) => {
      if (cancelled || !result.ok) return;
      setShell(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <UiPreferencesProvider
      initialPreferences={shell?.interfacePreferences ?? defaultPrefs}
    >
      <CountryProvider country={shell?.storeCountry ?? null}>
        <DashboardLayout
          storeName={shell?.storeName ?? null}
          userEmail={shell?.userEmail ?? null}
          planName={shell?.planName ?? null}
          exchangeRate={shell?.exchangeRate ?? null}
          exchangeRateUpdatedAt={shell?.exchangeRateUpdatedAt ?? null}
          exchangeRateStale={shell?.exchangeRateStale ?? false}
          isSupportAdmin={shell?.isSupportAdmin ?? false}
          isStoreOwner={shell?.isStoreOwner ?? false}
          storeRole={shell?.storeRole ?? null}
          canUpgradeToBusiness={shell?.canUpgradeToBusiness ?? false}
        >
          {shell?.bcvSyncAlert ? (
            <BcvSyncAlertBanner alert={shell.bcvSyncAlert} />
          ) : null}
          {children}
        </DashboardLayout>
      </CountryProvider>
    </UiPreferencesProvider>
  );
}
