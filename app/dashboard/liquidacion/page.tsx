import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { DailyDropshipSettlementCard } from "@/components/dashboard/orders/DailyDropshipSettlementCard";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { getDropshipDailySettlementSummary } from "@/lib/dropship/get-daily-settlement";
import { fetchActiveSubscriptionPaymentMethods } from "@/lib/plans/get-subscription-pago-movil";
import { requireDashboardRouteAccess } from "@/lib/team/route-guard";

export const dynamic = "force-dynamic";

export default async function LiquidacionPage() {
  const { session } = await requireDashboardRouteAccess("/dashboard/liquidacion");
  const { store } = session;

  if (!store) {
    return (
      <PageContainer as="div" className="py-6 sm:py-8">
        <DashboardPageHeader
          sectionLabel="Liquidación"
          title="Reportar Pago"
          description="Crea tu tienda primero para liquidar las ventas de productos mayoristas."
        />
        <div className="card-panel">
          <Link
            href="/dashboard/catalogo?vista=disponibles"
            className="btn-brand gap-2 shadow-sm"
          >
            Configurar mi tienda
          </Link>
        </div>
      </PageContainer>
    );
  }

  const [settlementResult, paymentMethods] = await Promise.all([
    getDropshipDailySettlementSummary(),
    fetchActiveSubscriptionPaymentMethods(),
  ]);

  return (
    <PageContainer as="div" className="py-6 sm:py-8">
      <DashboardPageHeader
        sectionLabel="Liquidación diaria"
        title="Reportar Pago"
        description={
          <>
            Revisa las ventas mayoristas pendientes, transfiere el consolidado a
            Alcéntimo y adjunta un solo comprobante.
          </>
        }
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
          variant="page"
        />
      ) : (
        <p className="card-panel text-sm text-zinc-500">
          No se pudo cargar el cierre diario. Intenta de nuevo.
        </p>
      )}
    </PageContainer>
  );
}
