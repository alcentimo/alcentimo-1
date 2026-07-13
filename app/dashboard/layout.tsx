import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getStoreProductLimitStatus } from "@/lib/plans/product-limit";
import { shouldShowProductLimitBanner } from "@/src/config/plans";
import { getStoreCatalogUrl } from "@/lib/stores";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CountryProvider } from "@/components/providers/CountryProvider";
import { CountryUnavailableNotice } from "@/components/country/CountryUnavailableNotice";
import {
  isCountryEnabled,
  resolveStoreCountry,
} from "@/lib/country-config";

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
  const productLimit = store ? await getStoreProductLimitStatus(store.id) : null;
  const resolvedCountry = store ? resolveStoreCountry(store.country) : null;

  if (store && resolvedCountry && !isCountryEnabled(resolvedCountry)) {
    return <CountryUnavailableNotice country={resolvedCountry} />;
  }

  return (
    <CountryProvider country={store?.country}>
      <DashboardLayout
        storeName={store?.name ?? null}
        catalogUrl={store ? getStoreCatalogUrl(store.slug) : null}
        userEmail={authUser.email ?? null}
        planName={authUser.plan.name}
        productLimit={
          productLimit && shouldShowProductLimitBanner(productLimit)
            ? productLimit
            : null
        }
      >
        {children}
      </DashboardLayout>
    </CountryProvider>
  );
}
