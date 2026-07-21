import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getCurrentExchangeRate } from "@/lib/catalog";
import { getCatalogPreviewSettings } from "@/lib/catalog/get-public-catalog-page-data";
import { getStoreInventory } from "@/lib/inventory";
import { getStoreProductFormConfig } from "@/lib/products/store-field-config";
import { getStoreProductLimitContext } from "@/lib/plans/product-limit";
import { getStoreOrders } from "@/lib/orders/get-store-orders";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import { defaultStoreSettingsConfig } from "@/lib/store-settings/defaults";
import { getStoreCustomers } from "@/lib/customers/get-store-customers";
import { getStoreAnalyticsPanel } from "@/lib/analytics/get-store-analytics";
import { getStoreCoupons } from "@/lib/coupons/actions";
import { getStorePromotions } from "@/lib/promotions/actions";
import { isStoreOwner } from "@/lib/stores/owner-access";
import {
  isDashboardPrefetchRoute,
  type DashboardPrefetchRoute,
} from "@/lib/dashboard/prefetch-routes";

export interface DashboardRoutePrefetchPayload {
  route: DashboardPrefetchRoute;
  fetchedAt: string;
  hasStore: boolean;
  /** Marca de datos precargados; la UI sigue renderizándose en el servidor. */
  warmed: true;
}

export async function loadDashboardRoutePrefetchData(
  routeKey: string,
): Promise<DashboardRoutePrefetchPayload | null> {
  if (!isDashboardPrefetchRoute(routeKey)) return null;

  const session = await getDashboardSession();
  if (!session) return null;

  const { store, authUser } = session;

  switch (routeKey) {
    case "catalogo": {
      if (!store) break;
      await Promise.all([
        getStoreInventory(store.slug),
        getCurrentExchangeRate(),
        getStoreProductFormConfig(store.id),
        getCatalogPreviewSettings(store),
        getStoreProductLimitContext(store.id),
      ]);
      break;
    }
    case "pedidos": {
      if (!store) break;
      await Promise.all([
        getStoreOrders(store.id, 200),
        getStoreSettingsConfig(store.id),
      ]);
      break;
    }
    case "clientes": {
      if (!store || !isStoreOwner(store, authUser.id)) break;
      await getStoreCustomers(store.id);
      break;
    }
    case "analiticas": {
      if (!store) break;
      const supabase = await createClient();
      await getStoreAnalyticsPanel(supabase, store.id, store.slug);
      break;
    }
    case "ajustes": {
      if (!store) break;
      await Promise.all([
        getStoreSettingsConfig(store.id),
        getStoreCoupons(store.id),
        getStorePromotions(store.id),
        getStoreInventory(store.slug),
        getCurrentExchangeRate(),
        getCatalogPreviewSettings(store),
      ]);
      break;
    }
    default: {
      const _exhaustive: never = routeKey;
      void _exhaustive;
      break;
    }
  }

  return {
    route: routeKey,
    fetchedAt: new Date().toISOString(),
    hasStore: Boolean(store),
    warmed: true,
  };
}

/** Precalienta datos compartidos del layout (sesión ya cacheada por request). */
export async function warmDashboardSharedData(storeId: string | null): Promise<void> {
  await getCurrentExchangeRate();
  if (storeId) {
    await getStoreSettingsConfig(storeId).catch(() => defaultStoreSettingsConfig());
  }
}
