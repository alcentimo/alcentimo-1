import { redirect } from "next/navigation";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { SupplierProductsPanel } from "@/components/supplier/SupplierProductsPanel";
import { loadSupplierHubDashboard } from "@/lib/supplier/load-hub-dashboard";
import { requireSupplierHubPageUser } from "@/lib/supplier/require-hub-page";

export const dynamic = "force-dynamic";

export default async function ProveedorHubInventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  await requireSupplierHubPageUser();

  const params = await searchParams;
  const tabRaw = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  if (tabRaw === "pedidos") {
    redirect("/proveedor/dashboard/hub/pedidos");
  }
  if (tabRaw === "pagos") {
    redirect("/proveedor/dashboard/hub/pedidos");
  }
  if (tabRaw === "historial") {
    redirect("/proveedor/dashboard/hub/analitica");
  }

  const data = await loadSupplierHubDashboard();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <DashboardPageHeader
        sectionLabel="Suministro"
        title="Inventario"
        description="Carga productos, stock y precios mayoristas para que Alcéntimo te compre."
      />
      {data.productsError ? (
        <p className="supplier-hub-alert">
          No se pudieron cargar los productos.
        </p>
      ) : null}
      <SupplierProductsPanel initialProducts={data.products} />
    </div>
  );
}
