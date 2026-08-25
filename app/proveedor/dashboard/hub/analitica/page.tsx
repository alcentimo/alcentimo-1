import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { SupplierSalesHistoryPanel } from "@/components/supplier/SupplierSalesHistoryPanel";
import { loadSupplierHubDashboard } from "@/lib/supplier/load-hub-dashboard";
import { requireSupplierHubPageUser } from "@/lib/supplier/require-hub-page";

export const dynamic = "force-dynamic";

export default async function ProveedorHubAnaliticaPage() {
  await requireSupplierHubPageUser();
  const data = await loadSupplierHubDashboard();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <DashboardPageHeader
        sectionLabel="Suministro"
        title="Analítica"
        description="Unidades vendidas a Alcéntimo, montos liquidados y estado de cada cobro."
      />
      {data.ordersError ? (
        <p className="supplier-hub-alert">
          No se pudieron cargar las ventas.
        </p>
      ) : null}
      <SupplierSalesHistoryPanel orders={data.orders} />
    </div>
  );
}
