import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SupplierDashboard } from "@/components/supplier/SupplierDashboard";
import {
  checkSupplierAccess,
  resolveSupplierAuthEmail,
} from "@/lib/supplier/access";
import { listSupplierProducts } from "@/lib/supplier/actions";
import { listSupplierOrders } from "@/lib/supplier/order-actions";

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

  const access = checkSupplierAccess(resolveSupplierAuthEmail(user));
  if (!access.ok) {
    redirect(`/dashboard/catalogo?proveedor_denied=${access.reason ?? "denied"}`);
  }

  const params = await searchParams;
  const tabRaw = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const initialTab = tabRaw === "pedidos" ? "pedidos" : "productos";

  const [listedProducts, listedOrders] = await Promise.all([
    listSupplierProducts(),
    listSupplierOrders(),
  ]);

  return (
    <SupplierDashboard
      initialProducts={listedProducts.products ?? []}
      initialOrders={listedOrders.orders ?? []}
      productsError={listedProducts.error ?? null}
      ordersError={listedOrders.error ?? null}
      initialTab={initialTab}
    />
  );
}
