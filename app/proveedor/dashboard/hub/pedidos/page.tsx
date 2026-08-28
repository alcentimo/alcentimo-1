import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { SupplierOrdersView } from "@/components/supplier/SupplierOrdersView";
import { loadSupplierHubDashboard } from "@/lib/supplier/load-hub-dashboard";
import { requireSupplierHubPageUser } from "@/lib/supplier/require-hub-page";

export const dynamic = "force-dynamic";

export default async function ProveedorHubPedidosPage() {
  await requireSupplierHubPageUser();
  const data = await loadSupplierHubDashboard();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <DashboardPageHeader
        sectionLabel="Suministro"
        title="Pedidos y pagos"
      />
      {data.ordersError ? (
        <p className="supplier-hub-alert">
          No se pudieron cargar los pedidos.
        </p>
      ) : null}
      {data.payoutsError ? (
        <p className="supplier-hub-alert">
          No se pudieron cargar las liquidaciones.
        </p>
      ) : null}
      <SupplierOrdersView
        initialOrders={data.orders}
        products={data.products}
        payouts={data.payouts}
      />
    </div>
  );
}
