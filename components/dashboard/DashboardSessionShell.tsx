"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  DashboardLayout,
  isStandaloneAuthPath,
} from "@/components/dashboard/DashboardLayout";
import { CountryProvider } from "@/components/providers/CountryProvider";
import { UiPreferencesProvider } from "@/components/providers/UiPreferencesProvider";
import {
  fetchDashboardShellData,
  type DashboardShellData,
} from "@/lib/dashboard/fetch-dashboard-shell-data";
import { DASHBOARD_SHELL_REFRESH_EVENT } from "@/lib/dashboard/shell-refresh";
import { defaultStoreSettingsConfig } from "@/lib/store-settings/defaults";
import type { AccountSnapshot } from "@/lib/account/types";
import { DashboardShellMetricsProvider } from "@/components/dashboard/DashboardShellMetrics";
import { PendingOrdersLoginToast } from "@/components/dashboard/PendingOrdersLoginToast";

const defaultPrefs = defaultStoreSettingsConfig().interfacePreferences;

type ShellOk = Extract<DashboardShellData, { ok: true }>;

/**
 * Chrome del dashboard sin bloqueo SSR: pinta al instante y completa
 * sesión / tasa / preferencias en el cliente.
 */
export function DashboardSessionShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPath = isStandaloneAuthPath(pathname);
  const [shell, setShell] = useState<ShellOk | null>(null);
  const [shellError, setShellError] = useState<string | null>(null);
  const [shellLoading, setShellLoading] = useState(true);

  const refreshShell = useCallback(() => {
    setShellLoading(true);
    void fetchDashboardShellData()
      .then((result) => {
        if (!result.ok) {
          setShellError(result.error || "No se pudo cargar la sesión del panel.");
          return;
        }
        setShellError(null);
        setShell(result);
      })
      .catch(() => {
        setShellError("No se pudo cargar la sesión del panel. Revisa tu conexión.");
      })
      .finally(() => {
        setShellLoading(false);
      });
  }, []);

  useEffect(() => {
    // En login / auth no hay sesión: no pedimos el shell ni mostramos el aviso.
    if (isAuthPath) {
      setShellError(null);
      setShellLoading(false);
      return;
    }
    refreshShell();
  }, [refreshShell, pathname, isAuthPath]);

  useEffect(() => {
    if (isAuthPath) return;

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
  }, [refreshShell, isAuthPath]);

  const accountSnapshot: AccountSnapshot | null = shell?.accountSnapshot ?? null;

  return (
    <UiPreferencesProvider
      initialPreferences={shell?.interfacePreferences ?? defaultPrefs}
    >
      <CountryProvider country={shell?.storeCountry ?? null}>
        <DashboardShellMetricsProvider
          value={{ pendingOrdersCount: shell?.pendingOrdersCount ?? 0 }}
        >
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
            pendingOrdersCount={shell?.pendingOrdersCount ?? 0}
            exchangeRate={shell?.exchangeRate ?? null}
            exchangeRateUpdatedAt={shell?.exchangeRateUpdatedAt ?? null}
            isSupportAdmin={shell?.isSupportAdmin ?? false}
            isStoreOwner={shell?.isStoreOwner ?? false}
            storeRole={shell?.storeRole ?? null}
            canUpgradeToBusiness={shell?.canUpgradeToBusiness ?? false}
            accountSnapshot={accountSnapshot}
          >
            {shellError && !shell && !isAuthPath ? (
              <div
                className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
                role="status"
              >
                <p className="font-medium">El menú del panel tarda en cargar</p>
                <p className="mt-1 text-amber-800/90 dark:text-amber-200/80">
                  {shellError}
                </p>
                <button
                  type="button"
                  className="mt-2 text-sm font-semibold underline underline-offset-2"
                  onClick={() => refreshShell()}
                  disabled={shellLoading}
                >
                  {shellLoading ? "Reintentando…" : "Reintentar"}
                </button>
              </div>
            ) : null}
            {children}
          </DashboardLayout>
          <PendingOrdersLoginToast
            pendingOrdersCount={shell?.pendingOrdersCount ?? 0}
            shellReady={Boolean(shell)}
          />
        </DashboardShellMetricsProvider>
      </CountryProvider>
    </UiPreferencesProvider>
  );
}
