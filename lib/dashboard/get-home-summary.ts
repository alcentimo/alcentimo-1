import type { SupabaseClient } from "@supabase/supabase-js";
import { getStoreInventory } from "@/lib/inventory";
import { countOutOfStock } from "@/lib/inventory/stock-status";
import { getStoreOrders } from "@/lib/orders/get-store-orders";
import { getStoreSales } from "@/lib/sales/get-store-sales";

export interface HomeSummary {
  productCount: number;
  pendingCatalogOrders: number;
  monthSalesTotal: number;
  outOfStockCount: number;
}

function startOfMonth(): Date {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function getHomeSummary(
  _supabase: SupabaseClient,
  storeId: string,
  storeSlug: string,
): Promise<HomeSummary> {
  const monthStart = startOfMonth();

  const [sales, ordersResult, inventory] = await Promise.all([
    getStoreSales(storeId, 500),
    getStoreOrders(storeId, { limit: 200 }),
    getStoreInventory(storeSlug),
  ]);

  const orders = ordersResult.orders;

  const monthSales = sales.filter(
    (sale) => new Date(sale.created_at) >= monthStart,
  );

  const pendingCatalogOrders = orders.filter((order) =>
    order.estado === "pendiente" || order.estado === "verificando",
  ).length;

  return {
    productCount: inventory.totalCount || inventory.products.length,
    pendingCatalogOrders,
    monthSalesTotal: monthSales.reduce((total, sale) => total + sale.monto, 0),
    outOfStockCount: countOutOfStock(inventory.products),
  };
}
