import { PageContainer } from "@/components/ui/PageContainer";
import { getStoreOrders } from "@/lib/orders/get-store-orders";
import { ORDERS_PAGE_SIZE } from "@/lib/inventory/constants";
import { getStoreInventory } from "@/lib/inventory";
import { getStoreLocations } from "@/lib/locations/get-store-locations";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import { defaultStoreSettingsConfig } from "@/lib/store-settings/defaults";
import { PedidosSection } from "@/components/dashboard/orders/PedidosSection";
import { requireSupplierHubSession } from "@/lib/supplier/own-store";
import { filterOwnBrandStorefrontOrders } from "@/lib/supplier/own-store-orders";
import { listOwnBrandCatalogProductIds } from "@/lib/supplier/own-store-ids";

export const dynamic = "force-dynamic";

export default async function ProveedorPedidosPage() {
  const { store } = await requireSupplierHubSession({
    requireOwnStorefront: true,
  });

  if (!store) {
    return (
      <PageContainer as="div" className="py-6 sm:py-8">
        <p className="text-sm text-zinc-500">
          Aún no pudimos preparar tu tienda propia. Recarga en unos segundos.
        </p>
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

  const ownIds = new Set(await listOwnBrandCatalogProductIds(store.id));
  const ownOrders = filterOwnBrandStorefrontOrders(orders).filter((order) =>
    order.items.every(
      (item) => !item.product_id || ownIds.has(item.product_id),
    ),
  );
  const catalogProducts = inventory.products.filter((product) =>
    ownIds.has(product.product_id),
  );

  const messageTemplates =
    settingsConfig.messageTemplates ?? defaultStoreSettingsConfig().messageTemplates;

  return (
    <PageContainer as="div" className="py-6 sm:py-8">
      <PedidosSection
        orders={ownOrders}
        initialTotalCount={Math.min(totalCount, ownOrders.length)}
        initialHasMore={hasMore && ownOrders.length >= ORDERS_PAGE_SIZE}
        storeName={store.name}
        messageTemplates={messageTemplates}
        locations={storeLocations}
        catalogProducts={catalogProducts}
      />
    </PageContainer>
  );
}
