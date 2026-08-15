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

export const dynamic = "force-dynamic";

export default async function ProveedorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dashboard/login?next=/proveedor/dashboard");
  }

  const access = await resolveSupplierAccess({
    email: resolveSupplierAuthEmail(user),
    userId: user.id,
    client: supabase,
  });
  if (!access.ok) {
    redirect(`/dashboard/catalogo?proveedor_denied=${access.reason ?? "denied"}`);
  }

  const params = await searchParams;
  const tabRaw = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const initialTab =
    tabRaw === "pedidos" || tabRaw === "pagos" ? tabRaw : "productos";

  const [listedProducts, listedOrders, paymentConfigResult] = await Promise.all([
    listSupplierProducts(),
    listSupplierOrders(),
    getSupplierPaymentConfig(),
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
      initialTab={initialTab}
    />
  );
}
