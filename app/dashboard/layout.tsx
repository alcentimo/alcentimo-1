import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getActiveBcvSyncAlert } from "@/lib/exchange-rate/get-bcv-sync-alert";
import { getCurrentExchangeRate } from "@/lib/catalog";
import { bcvRateAgeHours, isBcvRateStale } from "@/lib/exchange-rate/rate-freshness";
import { logBcvSync } from "@/lib/exchange-rate/bcv-sync-log";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";
import { isStoreOwner } from "@/lib/stores/owner-access";
import { normalizeDbPlan } from "@/lib/plans/plan-activation";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AdminPwaServiceWorkerRegister } from "@/components/dashboard/AdminPwaServiceWorkerRegister";
import { BcvSyncAlertBanner } from "@/components/dashboard/BcvSyncAlertBanner";
import { CountryProvider } from "@/components/providers/CountryProvider";
import { UiPreferencesProvider } from "@/components/providers/UiPreferencesProvider";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import { defaultStoreSettingsConfig } from "@/lib/store-settings/defaults";

export const dynamic = "force-dynamic";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const session = await getDashboardSession();

  if (!session) {
    return (
      <>
        <AdminPwaServiceWorkerRegister />
        {children}
      </>
    );
  }

  const { authUser, store } = session;
  const isAdmin = isSupportAdmin(
    resolveAuthEmail({ email: authUser.email, user_metadata: {} }),
  );
  const isStoreOwnerUser = store ? isStoreOwner(store, authUser.id) : false;
  const canUpgradeToBusiness =
    normalizeDbPlan(authUser.profile?.plan ?? authUser.rawPlan) === "PRO";
  const [bcvSyncAlert, exchangeRateRow, settingsConfig] = await Promise.all([
    getActiveBcvSyncAlert(supabase),
    getCurrentExchangeRate(),
    store
      ? getStoreSettingsConfig(store.id)
      : Promise.resolve(defaultStoreSettingsConfig()),
  ]);

  const exchangeRate = exchangeRateRow?.rate ?? null;
  const exchangeRateUpdatedAt = exchangeRateRow?.created_at ?? null;
  const exchangeRateStale = isBcvRateStale(exchangeRateUpdatedAt);

  if (exchangeRateStale) {
    logBcvSync(
      "dashboard_stale_rate",
      {
        updatedAt: exchangeRateUpdatedAt,
        ageHours: bcvRateAgeHours(exchangeRateUpdatedAt),
        rate: exchangeRate,
        hasActiveAlert: Boolean(bcvSyncAlert),
      },
      "warn",
    );
  }

  return (
    <>
      <AdminPwaServiceWorkerRegister />
      <UiPreferencesProvider
        initialPreferences={settingsConfig.interfacePreferences}
      >
        <CountryProvider country={store?.country}>
          <DashboardLayout
            storeName={store?.name ?? null}
            storeSlug={store?.slug ?? null}
            customDomain={store?.custom_domain ?? null}
            customDomainVerified={Boolean(store?.custom_domain_verified)}
            userEmail={authUser.email ?? null}
            planName={authUser.plan.name}
            exchangeRate={exchangeRate}
            exchangeRateUpdatedAt={exchangeRateUpdatedAt}
            exchangeRateStale={exchangeRateStale}
            isSupportAdmin={isAdmin}
            isStoreOwner={isStoreOwnerUser}
            canUpgradeToBusiness={canUpgradeToBusiness}
          >
            {bcvSyncAlert ? <BcvSyncAlertBanner alert={bcvSyncAlert} /> : null}
            {children}
          </DashboardLayout>
        </CountryProvider>
      </UiPreferencesProvider>
    </>
  );
}
