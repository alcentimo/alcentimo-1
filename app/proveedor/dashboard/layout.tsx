import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SupplierChrome } from "@/components/supplier/SupplierChrome";
import { resolveSupplierAuthEmail } from "@/lib/supplier/access";
import { getSupplierPublicStorefront } from "@/lib/supplier/get-storefront";
import { CountryProvider } from "@/components/providers/CountryProvider";
import { listSupplierOrders } from "@/lib/supplier/order-actions";
import { getCurrentExchangeRate } from "@/lib/catalog";

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

  const [ordersResult, exchange] = await Promise.all([
    user ? listSupplierOrders() : Promise.resolve({ orders: [] as const }),
    getCurrentExchangeRate().catch(() => null),
  ]);

  const pendingOrdersCount = (ordersResult.orders ?? []).filter(
    (order) => order.status !== "despachado",
  ).length;

  const storeName =
    storefront?.tradeName?.trim() ||
    storefront?.companyName?.trim() ||
    "Hub de proveedores";

  return (
    <CountryProvider country="Venezuela">
      <Suspense
        fallback={
          <div className="flex h-dvh items-center justify-center bg-zinc-50 text-sm text-zinc-500 dark:bg-zinc-950">
            Cargando panel…
          </div>
        }
      >
        <SupplierChrome
          email={email}
          storeName={storeName}
          pendingOrdersCount={pendingOrdersCount}
          exchangeRate={exchange?.rate ?? null}
          exchangeRateUpdatedAt={exchange?.created_at ?? null}
          showMerchantStoreLink={storefront?.storeModeEnabled === true}
        >
          {children}
        </SupplierChrome>
      </Suspense>
    </CountryProvider>
  );
}
