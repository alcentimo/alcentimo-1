import { PageContainer } from "@/components/ui/PageContainer";
import { DailyDropshipSettlementCard } from "@/components/dashboard/orders/DailyDropshipSettlementCard";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { getCurrentExchangeRate } from "@/lib/catalog";
import { getDropshipDailySettlementSummary } from "@/lib/dropship/get-daily-settlement";
import { fetchActiveSubscriptionPaymentMethods } from "@/lib/plans/get-subscription-pago-movil";
import { requireSupplierHubSession } from "@/lib/supplier/own-store";

export const dynamic = "force-dynamic";

export default async function ProveedorLiquidacionPage() {
  await requireSupplierHubSession({ requireOwnStorefront: true });

  const [settlementResult, paymentMethods, exchangeRate] = await Promise.all([
    getDropshipDailySettlementSummary(),
    fetchActiveSubscriptionPaymentMethods(),
    getCurrentExchangeRate(),
  ]);

  return (
    <PageContainer as="div" className="py-6 sm:py-8">
      <DashboardPageHeader
        sectionLabel="Liquidación diaria"
        title="Reportar Pago"
        description="Cierre del día con Alcéntimo. Las ventas de tu vitrina propia no incluyen mercancía de otros proveedores."
      />

      {settlementResult.error ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
          role="alert"
        >
          {settlementResult.error}
        </p>
      ) : settlementResult.summary ? (
        <DailyDropshipSettlementCard
          summary={settlementResult.summary}
          paymentMethods={paymentMethods}
          exchangeRate={exchangeRate?.rate ?? null}
          variant="page"
        />
      ) : (
        <p className="card-panel text-sm text-zinc-500">
          Hoy no hay un cierre de mercancía de terceros. Las órdenes de tu
          vitrina propia se gestionan en Órdenes.
        </p>
      )}
    </PageContainer>
  );
}
