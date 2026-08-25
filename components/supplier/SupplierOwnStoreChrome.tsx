"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DashboardShellMetricsProvider } from "@/components/dashboard/DashboardShellMetrics";
import { UiPreferencesProvider } from "@/components/providers/UiPreferencesProvider";
import { defaultStoreSettingsConfig } from "@/lib/store-settings/defaults";
import { SUPPLIER_LOGIN_PATH } from "@/lib/landing/supplier-zone-href";
import { SUPPLIER_OWN_STORE_NAV_PREFIX } from "@/src/config/dashboard-nav";
import type { AccountSnapshot } from "@/lib/account/types";

const defaultPrefs = defaultStoreSettingsConfig().interfacePreferences;

export function SupplierOwnStoreChrome({
  storeName,
  userEmail,
  pendingOrdersCount,
  exchangeRate,
  exchangeRateUpdatedAt,
  accountSnapshot,
  children,
}: {
  storeName: string | null;
  userEmail: string | null;
  pendingOrdersCount: number;
  exchangeRate: number | null;
  exchangeRateUpdatedAt: string | null;
  accountSnapshot?: AccountSnapshot | null;
  children: React.ReactNode;
}) {
  return (
    <UiPreferencesProvider initialPreferences={defaultPrefs}>
      <DashboardShellMetricsProvider
        value={{ pendingOrdersCount }}
      >
        <DashboardLayout
          storeName={storeName}
          userEmail={userEmail}
          pendingOrdersCount={pendingOrdersCount}
          exchangeRate={exchangeRate}
          exchangeRateUpdatedAt={exchangeRateUpdatedAt}
          isSupportAdmin={false}
          isStoreOwner
          storeRole="owner"
          accountSnapshot={accountSnapshot ?? null}
          navVariant="supplier_own_store"
          homeHref={`${SUPPLIER_OWN_STORE_NAV_PREFIX}/catalogo`}
          logoutHref={SUPPLIER_LOGIN_PATH}
        >
          {children}
        </DashboardLayout>
      </DashboardShellMetricsProvider>
    </UiPreferencesProvider>
  );
}
