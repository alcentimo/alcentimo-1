import { unstable_noStore as noStore } from "next/cache";
import { getStoreAnalyticsPanel } from "@/lib/analytics/get-store-analytics";
import { getCurrentExchangeRate } from "@/lib/catalog";
import type { OwnerAssistantContext } from "@/lib/ai/owner-assistant-types";
import { getStoreInventory } from "@/lib/inventory";
import {
  countCriticalStockProducts,
  countLowStock,
  countOutOfStock,
  getInventoryAlerts,
  getLowStockThreshold,
  isLowStock,
  isOutOfStock,
} from "@/lib/inventory/stock-status";
import { getStoreOrders } from "@/lib/orders/get-store-orders";
import { getStoreSales } from "@/lib/sales/get-store-sales";
import { createClient } from "@/lib/supabase/server";

const MAX_ALERT_ITEMS = 15;
const MAX_RECENT_ITEMS = 10;

function mapInventoryItem(
  product: Awaited<
    ReturnType<typeof getStoreInventory>
  >["products"][number],
): OwnerAssistantContext["inventory"]["lowStock"][number] {
  return {
    name: product.product_name,
    category: product.category_name,
    availableStock: product.available_stock,
    threshold: getLowStockThreshold(product),
    priceUsd: product.price_usd,
  };
}

export async function getOwnerAssistantContext(input: {
  storeId: string;
  storeSlug: string;
  storeName: string;
  storeRubro: string | null;
}): Promise<OwnerAssistantContext> {
  noStore();

  const supabase = await createClient();

  const [inventory, ordersResult, sales, exchangeRate, analyticsPanel] =
    await Promise.all([
      getStoreInventory(input.storeSlug, { limit: 500 }),
      getStoreOrders(input.storeId, { limit: 50 }),
      getStoreSales(input.storeId, 50),
      getCurrentExchangeRate(),
      getStoreAnalyticsPanel(supabase, input.storeId, input.storeSlug),
    ]);

  const alerts = getInventoryAlerts(inventory.products);
  const outOfStock = inventory.products
    .filter(isOutOfStock)
    .slice(0, MAX_ALERT_ITEMS)
    .map(mapInventoryItem);
  const lowStock = alerts
    .filter(isLowStock)
    .slice(0, MAX_ALERT_ITEMS)
    .map(mapInventoryItem);

  const pendingOrders = ordersResult.orders.filter(
    (order) => order.estado === "pendiente" || order.estado === "verificando",
  ).length;

  return {
    storeName: input.storeName,
    storeRubro: input.storeRubro,
    generatedAt: new Date().toISOString(),
    exchangeRate: {
      rate: exchangeRate?.rate ?? null,
      source: exchangeRate?.source ?? null,
      effectiveDate: exchangeRate?.effective_date ?? null,
    },
    inventory: {
      totalProducts: inventory.totalCount || inventory.products.length,
      outOfStockCount: countOutOfStock(inventory.products),
      lowStockCount: countLowStock(inventory.products),
      criticalStockCount: countCriticalStockProducts(inventory.products),
      outOfStock,
      lowStock,
    },
    sales: {
      todayUsd: analyticsPanel.salesComparison.todayUsd,
      monthToDateUsd: analyticsPanel.salesComparison.monthToDateUsd,
      pendingOrders,
      recentOrders: ordersResult.orders.slice(0, MAX_RECENT_ITEMS).map((order) => ({
        id: order.id,
        customerName: order.customer_name,
        totalUsd: order.total_usd,
        status: order.estado,
        createdAt: order.created_at,
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      })),
      recentManualSales: sales.slice(0, MAX_RECENT_ITEMS).map((sale) => ({
        productName: sale.product_name,
        amountUsd: sale.monto,
        quantity: sale.cantidad,
        createdAt: sale.created_at,
      })),
      topProducts: analyticsPanel.topProducts.slice(0, 8).map((product) => ({
        name: product.name,
        unitsSold: product.unitsSold,
      })),
    },
  };
}
