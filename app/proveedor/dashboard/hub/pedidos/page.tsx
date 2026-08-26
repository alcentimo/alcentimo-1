import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { SupplierOrdersPanel } from "@/components/supplier/SupplierOrdersPanel";
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
        title="Pedidos Mayoristas"
        description="Órdenes de compra de Alcéntimo: productos a preparar y estado de retiro. Alcéntimo retira la mercancía; no aparecen datos de clientes ni dropshippers."
      />
      {data.ordersError ? (
        <p className="supplier-hub-alert">
          No se pudieron cargar los pedidos.
        </p>
      ) : null}
      <SupplierOrdersPanel
        initialOrders={data.orders}
        products={data.products}
      />
    </div>
  );
}
