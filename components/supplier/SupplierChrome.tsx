"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DashboardShellMetricsProvider } from "@/components/dashboard/DashboardShellMetrics";
import { UiPreferencesProvider } from "@/components/providers/UiPreferencesProvider";
import { defaultStoreSettingsConfig } from "@/lib/store-settings/defaults";
import { SUPPLIER_LOGIN_PATH } from "@/lib/landing/supplier-zone-href";
import { SUPPLIER_HUB_NAV_PREFIX } from "@/src/config/dashboard-nav";
import type { AccountSnapshot } from "@/lib/account/types";

const defaultPrefs = defaultStoreSettingsConfig().interfacePreferences;

interface SupplierChromeProps {
  email: string | null;
  storeName?: string | null;
  pendingOrdersCount?: number;
  exchangeRate?: number | null;
  exchangeRateUpdatedAt?: string | null;
  accountSnapshot?: AccountSnapshot | null;
  showMerchantStoreLink?: boolean;
  children: React.ReactNode;
}

/** Shell del hub de proveedores — mismo layout que el panel dropshipper. */
export function SupplierChrome({
  email,
  storeName = "Hub de proveedores",
  pendingOrdersCount = 0,
  exchangeRate = null,
  exchangeRateUpdatedAt = null,
  accountSnapshot = null,
  showMerchantStoreLink = false,
  children,
}: SupplierChromeProps) {
  return (
    <UiPreferencesProvider initialPreferences={defaultPrefs}>
      <DashboardShellMetricsProvider value={{ pendingOrdersCount }}>
        <DashboardLayout
          storeName={storeName}
          userEmail={email}
          pendingOrdersCount={pendingOrdersCount}
          exchangeRate={exchangeRate}
          exchangeRateUpdatedAt={exchangeRateUpdatedAt}
          isSupportAdmin={false}
          isStoreOwner
          storeRole="owner"
          accountSnapshot={accountSnapshot}
          navVariant="supplier_hub"
          homeHref={SUPPLIER_HUB_NAV_PREFIX}
          logoutHref={SUPPLIER_LOGIN_PATH}
          showMerchantStoreLink={showMerchantStoreLink}
        >
          {children}
        </DashboardLayout>
      </DashboardShellMetricsProvider>
    </UiPreferencesProvider>
  );
}
