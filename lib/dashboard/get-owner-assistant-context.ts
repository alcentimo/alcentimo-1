import { unstable_noStore as noStore } from "next/cache";
import type {
  OwnerAssistantContext,
  OwnerAssistantInventoryItem,
  OwnerAssistantPendingAccount,
} from "@/lib/ai/owner-assistant-types";
import { getMegabodegaAssistantSnapshot } from "@/lib/ai/megabodega-context";
import { getStoreAnalyticsPanel } from "@/lib/analytics/get-store-analytics";
import { getCurrentExchangeRate } from "@/lib/catalog";
import { getStoreCustomers } from "@/lib/customers/get-store-customers";
import type { CatalogOrder } from "@/lib/orders/types";
import { getStoreOrders } from "@/lib/orders/get-store-orders";
import { isPriorityOrderEstado } from "@/lib/orders/order-status";
import { getStoreSales } from "@/lib/sales/get-store-sales";
import { createClient } from "@/lib/supabase/server";

const MAX_ALERT_ITEMS = 8;
const MAX_RECENT_ITEMS = 5;
const MAX_CUSTOMERS = 5;
const MEGABODEGA_LOW_STOCK = 3;

function mapMegabodegaItem(
  item: OwnerAssistantContext["megabodega"]["items"][number],
): OwnerAssistantInventoryItem {
  return {
    name: item.name,
    category: item.category,
    availableStock: item.stock,
    threshold: MEGABODEGA_LOW_STOCK,
    priceUsd: item.suggestedRetailUsd,
  };
}

function buildPendingAccounts(orders: CatalogOrder[]): OwnerAssistantPendingAccount[] {
  const pending = orders.filter((order) => isPriorityOrderEstado(order.estado));

  const byCustomer = new Map<string, OwnerAssistantPendingAccount>();

  for (const order of pending) {
    const key = `${order.customer_name.trim().toLowerCase()}|${(order.customer_phone ?? "").trim()}`;
    const existing = byCustomer.get(key);

    if (!existing) {
      byCustomer.set(key, {
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        pendingOrders: 1,
        pendingTotalUsd: order.total_usd,
        oldestPendingAt: order.created_at,
        statuses: [order.estado],
      });
      continue;
    }

    existing.pendingOrders += 1;
    existing.pendingTotalUsd += order.total_usd;
    if (order.created_at < existing.oldestPendingAt) {
      existing.oldestPendingAt = order.created_at;
    }
    if (!existing.statuses.includes(order.estado)) {
      existing.statuses.push(order.estado);
    }
  }

  return Array.from(byCustomer.values())
    .sort((a, b) => b.pendingTotalUsd - a.pendingTotalUsd)
    .slice(0, MAX_ALERT_ITEMS);
}

export async function getOwnerAssistantContext(input: {
  storeId: string;
  storeSlug: string;
  storeName: string;
  storeRubro: string | null;
  searchQuery?: string | null;
}): Promise<OwnerAssistantContext> {
  noStore();

  const supabase = await createClient();

  const [
    ordersResult,
    sales,
    exchangeRate,
    analyticsPanel,
    customers,
    megabodega,
  ] = await Promise.all([
    getStoreOrders(input.storeId, { limit: 100 }),
    getStoreSales(input.storeId, 50),
    getCurrentExchangeRate(),
    getStoreAnalyticsPanel(supabase, input.storeId, input.storeSlug),
    getStoreCustomers(input.storeId),
    getMegabodegaAssistantSnapshot({
      audience: "dropshipper",
      searchQuery: input.searchQuery,
    }),
  ]);

  const outOfStock = megabodega.items
    .filter((item) => item.stock <= 0)
    .slice(0, MAX_ALERT_ITEMS)
    .map(mapMegabodegaItem);
  const lowStock = megabodega.items
    .filter((item) => item.stock > 0 && item.stock <= MEGABODEGA_LOW_STOCK)
    .slice(0, MAX_ALERT_ITEMS)
    .map(mapMegabodegaItem);

  const pendingOrders = ordersResult.orders.filter((order) =>
    isPriorityOrderEstado(order.estado),
  );

  const ordersAwaitingPayment = pendingOrders
    .slice(0, MAX_RECENT_ITEMS)
    .map((order) => ({
      id: order.id,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      totalUsd: order.total_usd,
      status: order.estado,
      createdAt: order.created_at,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      hasPaymentProof: Boolean(order.payment_proof_url),
    }));

  const comboCategories = [
    ...new Set(
      megabodega.items
        .filter((item) => item.stock > 0)
        .map((item) => item.category)
        .filter(Boolean),
    ),
  ].slice(0, 6);

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
      totalProducts: megabodega.totalProducts,
      outOfStockCount: megabodega.outOfStockCount,
      lowStockCount: lowStock.length,
      criticalStockCount: outOfStock.length,
      outOfStock,
      lowStock,
      slowMoving: [],
      excessStock: [],
    },
    sales: {
      todayUsd: analyticsPanel.financialKpis.todaySalesUsd,
      monthToDateUsd: analyticsPanel.financialKpis.monthToDateUsd,
      pendingOrders: pendingOrders.length,
      recentOrders: ordersResult.orders.slice(0, MAX_RECENT_ITEMS).map((order) => ({
        id: order.id,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        totalUsd: order.total_usd,
        status: order.estado,
        createdAt: order.created_at,
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        hasPaymentProof: Boolean(order.payment_proof_url),
      })),
      recentManualSales: sales.slice(0, MAX_RECENT_ITEMS).map((sale) => ({
        productName: sale.product_name,
        amountUsd: sale.monto,
        quantity: sale.cantidad,
        createdAt: sale.created_at,
      })),
      topProducts: analyticsPanel.topProductsByUnits.slice(0, 8).map((product) => ({
        name: product.name,
        unitsSold: product.unitsSold,
      })),
    },
    customers: {
      registeredCount: customers.length,
      topCustomers: customers.slice(0, MAX_CUSTOMERS).map((customer) => ({
        name: customer.displayName,
        phone: customer.phone,
        orderCount: customer.orderCount,
        totalSpentUsd: customer.totalSpentUsd,
        lastOrderAt: customer.lastOrderAt,
      })),
      pendingAccounts: buildPendingAccounts(ordersResult.orders),
      ordersAwaitingPayment,
    },
    marketing: {
      slowMovingCount: 0,
      excessStockCount: 0,
      comboOpportunityCategories: comboCategories,
    },
    megabodega,
  };
}
