import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SupplierProductsPanel } from "@/components/supplier/SupplierProductsPanel";
import {
  checkSupplierAccess,
  resolveSupplierAuthEmail,
} from "@/lib/supplier/access";
import { listSupplierProducts } from "@/lib/supplier/actions";

export const dynamic = "force-dynamic";

export default async function ProveedorDashboardPage() {
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

  const listed = await listSupplierProducts();
  const products = listed.error ? [] : listed.products;
  const loadError = listed.error;

  return (
    <div className="space-y-4">
      {loadError ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          No se pudieron cargar los productos ({loadError}). Si acabas de
          desplegar, aplica la migración{" "}
          <code className="rounded bg-white/70 px-1">093_supplier_products</code>{" "}
          en Supabase.
        </p>
      ) : null}
      <SupplierProductsPanel initialProducts={products} />
    </div>
  );
}
