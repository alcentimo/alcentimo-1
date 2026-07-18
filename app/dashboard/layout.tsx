import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getActiveBcvSyncAlert } from "@/lib/exchange-rate/get-bcv-sync-alert";
import { getCurrentExchangeRate } from "@/lib/catalog";
import { getLatestUsdTasa } from "@/lib/exchange-rate/get-tasa-cambio";
import { bcvRateAgeHours, isBcvRateStale } from "@/lib/exchange-rate/rate-freshness";
import { logBcvSync } from "@/lib/exchange-rate/bcv-sync-log";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";
import { isStoreOwner } from "@/lib/stores/owner-access";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { BcvSyncAlertBanner } from "@/components/dashboard/BcvSyncAlertBanner";
import { CountryProvider } from "@/components/providers/CountryProvider";

export const dynamic = "force-dynamic";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const session = await getDashboardSession(supabase);

  if (!session) {
    return <>{children}</>;
  }

  const { authUser, store } = session;
  const {
    data: { user: authAccount },
  } = await supabase.auth.getUser();
  const isAdmin = isSupportAdmin(resolveAuthEmail(authAccount));
  const isStoreOwnerUser = store ? isStoreOwner(store, authUser.id) : false;
  const [bcvSyncAlert, exchangeRateRow, tasaRow] = await Promise.all([
    getActiveBcvSyncAlert(supabase),
    getCurrentExchangeRate(),
    getLatestUsdTasa(supabase),
  ]);

  const exchangeRate = exchangeRateRow?.rate ?? tasaRow?.tasa ?? null;
  const exchangeRateUpdatedAt =
    tasaRow?.ultima_actualizacion ?? exchangeRateRow?.created_at ?? null;
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
    <CountryProvider country={store?.country}>
      <DashboardLayout
        storeName={store?.name ?? null}
        storeSlug={store?.slug ?? null}
        userEmail={authUser.email ?? null}
        planName={authUser.plan.name}
        exchangeRate={exchangeRate}
        exchangeRateUpdatedAt={exchangeRateUpdatedAt}
        exchangeRateStale={exchangeRateStale}
        isSupportAdmin={isAdmin}
        isStoreOwner={isStoreOwnerUser}
      >
        {bcvSyncAlert ? <BcvSyncAlertBanner alert={bcvSyncAlert} /> : null}
        {children}
      </DashboardLayout>
    </CountryProvider>
  );
}
