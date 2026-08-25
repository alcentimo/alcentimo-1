import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SupplierChrome } from "@/components/supplier/SupplierChrome";
import { SupplierOwnStoreChrome } from "@/components/supplier/SupplierOwnStoreChrome";
import { resolveSupplierAuthEmail } from "@/lib/supplier/access";
import { getSupplierPublicStorefront } from "@/lib/supplier/get-storefront";
import { CountryProvider } from "@/components/providers/CountryProvider";
import { ensureSupplierOwnStore } from "@/lib/supplier/own-store";
import { getCurrentExchangeRate } from "@/lib/catalog";
import { getPendingOrdersCount } from "@/lib/orders/get-pending-orders-count";

export default async function ProveedorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = resolveSupplierAuthEmail(user) ?? user?.email ?? null;
  const storefront = user
    ? await getSupplierPublicStorefront(user.id)
    : null;
  const ownStorefront = storefront?.showPublicCatalog === true;

  const store =
    ownStorefront && user ? await ensureSupplierOwnStore(user.id) : null;
  const [exchangeRate, pendingOrdersCount] = ownStorefront
    ? await Promise.all([
        getCurrentExchangeRate(),
        store ? getPendingOrdersCount(store.id) : Promise.resolve(0),
      ])
    : [null, 0];

  return (
    <CountryProvider country="Venezuela">
      <Suspense
        fallback={
          <div className="supplier-hub-shell">
            <main className="supplier-hub-main">
              <div className="supplier-hub-card text-sm text-zinc-500">
                Cargando panel…
              </div>
            </main>
          </div>
        }
      >
        {ownStorefront ? (
          <SupplierOwnStoreChrome
            storeName={store?.name ?? storefront?.tradeName ?? null}
            userEmail={email}
            pendingOrdersCount={pendingOrdersCount}
            exchangeRate={exchangeRate?.rate ?? null}
            exchangeRateUpdatedAt={exchangeRate?.created_at ?? null}
          >
            {children}
          </SupplierOwnStoreChrome>
        ) : (
          <SupplierChrome email={email} showStorefrontSettings={false}>
            {children}
          </SupplierChrome>
        )}
      </Suspense>
    </CountryProvider>
  );
}
