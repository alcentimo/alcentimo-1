import { unstable_noStore as noStore } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStoreAnalyticsPanel } from "@/lib/analytics/get-store-analytics";
import { getCurrentExchangeRate } from "@/lib/catalog";
import type {
  OwnerAssistantContext,
  OwnerAssistantPendingAccount,
  OwnerAssistantSlowMovingItem,
} from "@/lib/ai/owner-assistant-types";
import { getStoreCustomers } from "@/lib/customers/get-store-customers";
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
import type { CatalogOrder } from "@/lib/orders/types";
import { getStoreOrders } from "@/lib/orders/get-store-orders";
import { getStoreSales } from "@/lib/sales/get-store-sales";
import { createClient } from "@/lib/supabase/server";

const MAX_ALERT_ITEMS = 15;
const MAX_RECENT_ITEMS = 10;
const MAX_CUSTOMERS = 12;
const ANALYTICS_FETCH_LIMIT = 2000;
const SLOW_MOVING_MIN_STOCK = 3;
const EXCESS_STOCK_MIN = 10;
const EXCESS_STOCK_MAX_MONTHLY_UNITS = 2;

interface VentaRow {
  producto_id: string;
  cantidad: number;
  created_at: string;
}

function isCurrentMonth(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

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

function buildMonthlyUnitsSoldMap(
  ventas: VentaRow[],
  orders: CatalogOrder[],
): Map<string, number> {
  const map = new Map<string, number>();

  for (const venta of ventas) {
    if (!isCurrentMonth(venta.created_at)) continue;
    const units = Number(venta.cantidad) || 0;
    map.set(
      venta.producto_id,
      (map.get(venta.producto_id) ?? 0) + units,
    );
  }

  for (const order of orders) {
    if (!isCurrentMonth(order.created_at)) continue;
    for (const item of order.items) {
      map.set(
        item.product_id,
        (map.get(item.product_id) ?? 0) + item.quantity,
      );
    }
  }

  return map;
}

function computeSlowMovingAndExcess(
  products: Awaited<ReturnType<typeof getStoreInventory>>["products"],
  unitsSoldMap: Map<string, number>,
): {
  slowMoving: OwnerAssistantSlowMovingItem[];
  excessStock: OwnerAssistantSlowMovingItem[];
} {
  const slowMoving: OwnerAssistantSlowMovingItem[] = [];
  const excessStock: OwnerAssistantSlowMovingItem[] = [];

  for (const product of products) {
    if (product.available_stock <= 0) continue;

    const unitsSoldThisMonth = unitsSoldMap.get(product.product_id) ?? 0;
    const item: OwnerAssistantSlowMovingItem = {
      ...mapInventoryItem(product),
      unitsSoldThisMonth,
    };

    if (
      product.available_stock >= SLOW_MOVING_MIN_STOCK &&
      unitsSoldThisMonth === 0
    ) {
      slowMoving.push(item);
    }

    if (
      product.available_stock >= EXCESS_STOCK_MIN &&
      unitsSoldThisMonth <= EXCESS_STOCK_MAX_MONTHLY_UNITS
    ) {
      excessStock.push(item);
    }
  }

  const byStockDesc = (a: OwnerAssistantSlowMovingItem, b: OwnerAssistantSlowMovingItem) =>
    b.availableStock - a.availableStock;

  return {
    slowMoving: slowMoving.sort(byStockDesc).slice(0, MAX_ALERT_ITEMS),
    excessStock: excessStock.sort(byStockDesc).slice(0, MAX_ALERT_ITEMS),
  };
}

function buildPendingAccounts(orders: CatalogOrder[]): OwnerAssistantPendingAccount[] {
  const pending = orders.filter(
    (order) => order.estado === "pendiente" || order.estado === "verificando",
  );

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

async function fetchMonthlyVentas(
  supabase: SupabaseClient,
  storeId: string,
): Promise<VentaRow[]> {
  const { data, error } = await supabase
    .from("ventas")
    .select("producto_id, cantidad, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(ANALYTICS_FETCH_LIMIT);

  if (error) throw new Error(error.message);
  return (data ?? []) as VentaRow[];
}

export async function getOwnerAssistantContext(input: {
  storeId: string;
  storeSlug: string;
  storeName: string;
  storeRubro: string | null;
}): Promise<OwnerAssistantContext> {
  noStore();

  const supabase = await createClient();

  const [
    inventory,
    ordersResult,
    sales,
    exchangeRate,
    analyticsPanel,
    customers,
    ventas,
  ] = await Promise.all([
    getStoreInventory(input.storeSlug, { limit: 500 }),
    getStoreOrders(input.storeId, { limit: 100 }),
    getStoreSales(input.storeId, 50),
    getCurrentExchangeRate(),
    getStoreAnalyticsPanel(supabase, input.storeId, input.storeSlug),
    getStoreCustomers(input.storeId),
    fetchMonthlyVentas(supabase, input.storeId),
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

  const unitsSoldMap = buildMonthlyUnitsSoldMap(ventas, ordersResult.orders);
  const { slowMoving, excessStock } = computeSlowMovingAndExcess(
    inventory.products,
    unitsSoldMap,
  );

  const pendingOrders = ordersResult.orders.filter(
    (order) => order.estado === "pendiente" || order.estado === "verificando",
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
    ...new Set(slowMoving.map((item) => item.category).filter(Boolean)),
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
      totalProducts: inventory.totalCount || inventory.products.length,
      outOfStockCount: countOutOfStock(inventory.products),
      lowStockCount: countLowStock(inventory.products),
      criticalStockCount: countCriticalStockProducts(inventory.products),
      outOfStock,
      lowStock,
      slowMoving,
      excessStock,
    },
    sales: {
      todayUsd: analyticsPanel.salesComparison.todayUsd,
      monthToDateUsd: analyticsPanel.salesComparison.monthToDateUsd,
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
      topProducts: analyticsPanel.topProducts.slice(0, 8).map((product) => ({
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
      slowMovingCount: slowMoving.length,
      excessStockCount: excessStock.length,
      comboOpportunityCategories: comboCategories,
    },
  };
}
