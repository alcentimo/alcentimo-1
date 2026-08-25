import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { SupplierPaymentsPanel } from "@/components/supplier/SupplierPaymentsPanel";
import { loadSupplierHubDashboard } from "@/lib/supplier/load-hub-dashboard";
import { requireSupplierHubPageUser } from "@/lib/supplier/require-hub-page";

export const dynamic = "force-dynamic";

export default async function ProveedorHubPagosPage() {
  await requireSupplierHubPageUser();
  const data = await loadSupplierHubDashboard();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <DashboardPageHeader
        sectionLabel="Suministro"
        title="Pagos"
        description="Liquidaciones acreditadas y datos de tu cuenta para cobrar."
      />
      {data.paymentConfigError ? (
        <p className="supplier-hub-alert">
          No se pudieron cargar los datos de pago.
        </p>
      ) : null}
      {data.payoutsError ? (
        <p className="supplier-hub-alert">
          No se pudieron cargar las liquidaciones.
        </p>
      ) : null}
      <SupplierPaymentsPanel
        initialConfig={data.paymentConfig}
        payouts={data.payouts}
        creditedBalanceUsd={data.creditedBalanceUsd}
      />
    </div>
  );
}
