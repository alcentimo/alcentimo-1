import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SupplierDashboard } from "@/components/supplier/SupplierDashboard";
import {
  resolveSupplierAccess,
  resolveSupplierAuthEmail,
} from "@/lib/supplier/access";
import { listSupplierProducts } from "@/lib/supplier/actions";
import { listSupplierOrders } from "@/lib/supplier/order-actions";
import { getSupplierPaymentConfig } from "@/lib/supplier/payment-actions";
import { defaultSupplierPaymentConfig } from "@/lib/supplier/payment-types";
import { listMySupplierPayoutObligations } from "@/lib/dropship/get-supplier-payouts";
import { getSupplierPublicStorefront } from "@/lib/supplier/get-storefront";

export const dynamic = "force-dynamic";

export default async function ProveedorHubPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/proveedor/login");
  }

  const access = await resolveSupplierAccess({
    email: resolveSupplierAuthEmail(user),
    userId: user.id,
    user,
  });
  if (!access.ok) {
    redirect(`/proveedor/registro?error=${access.reason ?? "denied"}`);
  }

  const storefront = await getSupplierPublicStorefront(user.id);

  const params = await searchParams;
  const tabRaw = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const initialTab =
    tabRaw === "pedidos" || tabRaw === "pagos" || tabRaw === "historial"
      ? tabRaw
      : "productos";

  const [listedProducts, listedOrders, paymentConfigResult, payoutsResult] =
    await Promise.all([
      listSupplierProducts(),
      listSupplierOrders(),
      getSupplierPaymentConfig(),
      listMySupplierPayoutObligations(),
    ]);

  return (
    <SupplierDashboard
      initialProducts={listedProducts.products ?? []}
      initialOrders={listedOrders.orders ?? []}
      initialPaymentConfig={
        paymentConfigResult.config ?? defaultSupplierPaymentConfig()
      }
      productsError={listedProducts.error ?? null}
      ordersError={listedOrders.error ?? null}
      paymentConfigError={paymentConfigResult.error ?? null}
      payouts={payoutsResult.payouts ?? []}
      creditedBalanceUsd={payoutsResult.creditedBalanceUsd ?? 0}
      payoutsError={payoutsResult.error ?? null}
      initialTab={initialTab}
      storeModeEnabled={storefront?.storeModeEnabled === true}
    />
  );
}
