import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getStoreOrders } from "@/lib/orders/get-store-orders";
import { ORDERS_PAGE_SIZE } from "@/lib/inventory/constants";
import { getStoreInventory } from "@/lib/inventory";
import { getStoreLocations } from "@/lib/locations/get-store-locations";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import { defaultStoreSettingsConfig } from "@/lib/store-settings/defaults";
import { PedidosSection } from "@/components/dashboard/orders/PedidosSection";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
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

  const [{ orders, totalCount, hasMore }, settingsConfig, storeLocations, inventory] =
    await Promise.all([
      getStoreOrders(store.id, { limit: ORDERS_PAGE_SIZE, offset: 0 }),
      getStoreSettingsConfig(store.id),
      getStoreLocations(store.id).catch(() => []),
      getStoreInventory(store.slug, { limit: 200, offset: 0 }),
    ]);

  const messageTemplates =
    settingsConfig.messageTemplates ?? defaultStoreSettingsConfig().messageTemplates;

  return (
    <PageContainer as="div" className="py-6 sm:py-8">
      <PedidosSection
        orders={orders}
        initialTotalCount={totalCount}
        initialHasMore={hasMore}
        storeName={store.name}
        messageTemplates={messageTemplates}
        locations={storeLocations}
        catalogProducts={inventory.products}
      />
    </PageContainer>
  );
}
