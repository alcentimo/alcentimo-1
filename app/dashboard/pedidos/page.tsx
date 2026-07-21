import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getStoreOrders } from "@/lib/orders/get-store-orders";
import { ORDERS_PAGE_SIZE } from "@/lib/inventory/constants";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import { defaultStoreSettingsConfig } from "@/lib/store-settings/defaults";
import { OrdersPanel } from "@/components/dashboard/orders/OrdersPanel";
import { getTransactionalCatalogPublicUrl } from "@/lib/stores";

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
          <Link href="/dashboard/productos/nuevo" className="btn-brand gap-2 shadow-sm">
            Configurar mi tienda
          </Link>
        </div>
      </PageContainer>
    );
  }

  const [{ orders, totalCount, hasMore }, settingsConfig] = await Promise.all([
    getStoreOrders(store.id, { limit: ORDERS_PAGE_SIZE, offset: 0 }),
    getStoreSettingsConfig(store.id),
  ]);

  const messageTemplates =
    settingsConfig.messageTemplates ?? defaultStoreSettingsConfig().messageTemplates;

  return (
    <PageContainer as="div" className="py-6 sm:py-8">
      <header className="page-header">
        <p className="section-label">Centro de operaciones</p>
        <h1 className="page-header-title">Pedidos</h1>
        <p className="page-header-desc">
          Gestiona ventas, estados y clientes desde{" "}
          <Link
            href={getTransactionalCatalogPublicUrl(store.slug)}
            className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            target="_blank"
            rel="noopener noreferrer"
          >
            {new URL(getTransactionalCatalogPublicUrl(store.slug)).host}
          </Link>
          . Toca un pedido para ver el detalle sin salir de la lista.
        </p>
      </header>

      <OrdersPanel
        orders={orders}
        initialTotalCount={totalCount}
        initialHasMore={hasMore}
        storeName={store.name}
        messageTemplates={messageTemplates}
      />
    </PageContainer>
  );
}
