import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getStoreOrders } from "@/lib/orders/get-store-orders";
import { ORDERS_PAGE_SIZE } from "@/lib/inventory/constants";
import { getStoreLocations } from "@/lib/locations/get-store-locations";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import { defaultStoreSettingsConfig } from "@/lib/store-settings/defaults";
import { OrdersPanel } from "@/components/dashboard/orders/OrdersPanel";
import { DailyDropshipSettlementCard } from "@/components/dashboard/orders/DailyDropshipSettlementCard";
import { getDropshipDailySettlementSummary } from "@/lib/dropship/get-daily-settlement";
import { fetchActiveSubscriptionPaymentMethods } from "@/lib/plans/get-subscription-pago-movil";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  const supabase = await createClient();
  const session = await getDashboardSession();

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/pedidos");
  }

  const { store } = session;

  if (!store) {
    return (
      <PageContainer as="div" className="py-6 sm:py-8">
        <header className="page-header">
          <p className="section-label">Pedidos</p>
          <h1 className="page-header-title">Pedidos del catálogo</h1>
          <p className="page-header-desc">
            Crea tu tienda primero para recibir pedidos del catálogo público.
          </p>
        </header>
        <div className="card-panel">
          <Link href="/dashboard/catalogo?vista=disponibles" className="btn-brand gap-2 shadow-sm">
            Configurar mi tienda
          </Link>
        </div>
      </PageContainer>
    );
  }

  const [
    { orders, totalCount, hasMore },
    settingsConfig,
    storeLocations,
    settlementResult,
    paymentMethods,
  ] = await Promise.all([
    getStoreOrders(store.id, { limit: ORDERS_PAGE_SIZE, offset: 0 }),
    getStoreSettingsConfig(store.id),
    getStoreLocations(store.id).catch(() => []),
    getDropshipDailySettlementSummary(),
    fetchActiveSubscriptionPaymentMethods(),
  ]);

  const messageTemplates =
    settingsConfig.messageTemplates ?? defaultStoreSettingsConfig().messageTemplates;

  return (
    <PageContainer as="div" className="py-6 sm:py-8">
      <header className="page-header">
        <p className="section-label">Centro de operaciones</p>
        <h1 className="page-header-title">Pedidos</h1>
        <p className="page-header-desc">
          Gestiona ventas, estados y clientes del catálogo público de {store.name}.
          Toca un pedido para ver el detalle sin salir de la lista.
        </p>
      </header>

      {settlementResult.summary ? (
        <DailyDropshipSettlementCard
          summary={settlementResult.summary}
          paymentMethods={paymentMethods}
        />
      ) : null}

      <OrdersPanel
        orders={orders}
        initialTotalCount={totalCount}
        initialHasMore={hasMore}
        storeName={store.name}
        messageTemplates={messageTemplates}
        locations={storeLocations}
      />
    </PageContainer>
  );
}
