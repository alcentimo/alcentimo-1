import type { SupabaseClient } from "@supabase/supabase-js";
import { getStoreInventory } from "@/lib/inventory";
import { getStoreOrders } from "@/lib/orders/get-store-orders";
import type {
  DailySalesVolume,
  LowStockProductInsight,
  RegistrationMetrics,
  SalesComparison,
  StoreAnalytics,
  StoreAnalyticsPanel,
  TopProductInsight,
} from "@/lib/analytics/types";

const ANALYTICS_LOW_STOCK_THRESHOLD = 3;
const ANALYTICS_FETCH_LIMIT = 5000;
const REGISTRATION_METRICS_DAYS = 30;

interface VentaAnalyticsRow {
  producto_id: string;
  cantidad: number;
  monto: number;
  created_at: string;
  products: {
    name?: string;
    product_images?: { thumb_url?: string | null; is_primary?: boolean }[];
  } | null;
}

function toDateKey(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isToday(iso: string): boolean {
  return toDateKey(iso) === toDateKey(new Date().toISOString());
}

function isCurrentMonth(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

function getLast7Days(): { date: string; label: string }[] {
  const weekday = new Intl.DateTimeFormat("es", { weekday: "short" });
  const days: { date: string; label: string }[] = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    days.push({
      date: toDateKey(date.toISOString()),
      label: weekday.format(date).replace(".", ""),
    });
  }

  return days;
}

function pickThumbUrl(
  images: { thumb_url?: string | null; is_primary?: boolean }[] | undefined,
): string | null {
  if (!images?.length) return null;
  const primary = images.find((image) => image.is_primary) ?? images[0];
  return primary?.thumb_url ?? null;
}

function accumulateProductSales(
  map: Map<string, TopProductInsight>,
  productId: string,
  name: string,
  units: number,
  thumbUrl: string | null,
) {
  const current = map.get(productId);
  if (current) {
    current.unitsSold += units;
    if (!current.thumbUrl && thumbUrl) current.thumbUrl = thumbUrl;
    return;
  }

  map.set(productId, {
    productId,
    name,
    unitsSold: units,
    thumbUrl,
  });
}

function getMonthLabel(): string {
  return new Intl.DateTimeFormat("es", { month: "long" }).format(new Date());
}

async function fetchSalesSources(
  supabase: SupabaseClient,
  storeId: string,
) {
  const [ventasResult, orders] = await Promise.all([
    supabase
      .from("ventas")
      .select(
        `
        producto_id,
        cantidad,
        monto,
        created_at,
        products:producto_id (
          name,
          product_images (
            thumb_url,
            is_primary
          )
        )
      `,
      )
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(ANALYTICS_FETCH_LIMIT),
    getStoreOrders(storeId, ANALYTICS_FETCH_LIMIT),
  ]);

  if (ventasResult.error) {
    throw new Error(ventasResult.error.message);
  }

  return {
    ventas: (ventasResult.data ?? []) as VentaAnalyticsRow[],
    orders,
  };
}

function buildProductSalesInsights(
  ventas: VentaAnalyticsRow[],
  orders: Awaited<ReturnType<typeof getStoreOrders>>,
  inventoryThumbById: Map<string, string | null>,
): TopProductInsight[] {
  const productSales = new Map<string, TopProductInsight>();

  for (const venta of ventas) {
    const product = venta.products;
    accumulateProductSales(
      productSales,
      venta.producto_id,
      product?.name ?? "Producto",
      Number(venta.cantidad) || 0,
      pickThumbUrl(product?.product_images),
    );
  }

  for (const order of orders) {
    for (const item of order.items) {
      accumulateProductSales(
        productSales,
        item.product_id,
        item.product_name,
        item.quantity,
        null,
      );
    }
  }

  const topProducts = Array.from(productSales.values())
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 5);

  for (const product of topProducts) {
    if (!product.thumbUrl) {
      product.thumbUrl = inventoryThumbById.get(product.productId) ?? null;
    }
  }

  return topProducts;
}

function computeSalesComparison(
  ventas: VentaAnalyticsRow[],
  orders: Awaited<ReturnType<typeof getStoreOrders>>,
): SalesComparison {
  let todayUsd = 0;
  let monthToDateUsd = 0;

  for (const venta of ventas) {
    const amount = Number(venta.monto) || 0;
    if (isToday(venta.created_at)) todayUsd += amount;
    if (isCurrentMonth(venta.created_at)) monthToDateUsd += amount;
  }

  for (const order of orders) {
    if (isToday(order.created_at)) todayUsd += order.total_usd;
    if (isCurrentMonth(order.created_at)) monthToDateUsd += order.total_usd;
  }

  const monthName = getMonthLabel();

  return {
    todayUsd,
    monthToDateUsd,
    todayLabel: "Hoy",
    monthLabel: monthName.charAt(0).toUpperCase() + monthName.slice(1),
  };
}

async function getRegistrationMetrics(
  supabase: SupabaseClient,
  storeId: string,
): Promise<RegistrationMetrics> {
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - REGISTRATION_METRICS_DAYS);
  periodStart.setHours(0, 0, 0, 0);
  const periodStartIso = periodStart.toISOString();

  const [visitorsResult, registrationsResult, profilesResult] = await Promise.all([
    supabase
      .from("catalog_visits")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .gte("last_seen_at", periodStartIso),
    supabase
      .from("catalog_visits")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .not("registered_at", "is", null)
      .gte("registered_at", periodStartIso),
    supabase
      .from("customer_profiles")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .gte("created_at", periodStartIso),
  ]);

  if (visitorsResult.error) {
    throw new Error(visitorsResult.error.message);
  }
  if (registrationsResult.error) {
    throw new Error(registrationsResult.error.message);
  }
  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  const uniqueVisitors = visitorsResult.count ?? 0;
  const trackedRegistrations = registrationsResult.count ?? 0;
  const newCustomerProfiles = profilesResult.count ?? 0;
  const registrations = Math.max(trackedRegistrations, newCustomerProfiles);
  const registrationRatePct =
    uniqueVisitors > 0
      ? Math.round((registrations / uniqueVisitors) * 1000) / 10
      : 0;

  return {
    periodDays: REGISTRATION_METRICS_DAYS,
    uniqueVisitors,
    registrations,
    registrationRatePct,
    newCustomerProfiles,
    trackingEnabled: uniqueVisitors > 0,
  };
}

/** Datos para el panel simplificado de analíticas. */
export async function getStoreAnalyticsPanel(
  supabase: SupabaseClient,
  storeId: string,
  storeSlug: string,
): Promise<StoreAnalyticsPanel> {
  const [{ ventas, orders }, inventory, registrationMetrics] = await Promise.all([
    fetchSalesSources(supabase, storeId),
    getStoreInventory(storeSlug),
    getRegistrationMetrics(supabase, storeId),
  ]);

  const inventoryThumbById = new Map(
    inventory.products.map((product) => [product.product_id, product.thumb_url]),
  );

  return {
    salesComparison: computeSalesComparison(ventas, orders),
    topProducts: buildProductSalesInsights(ventas, orders, inventoryThumbById),
    registrationMetrics,
  };
}

/** Tablero completo (KPIs, semanal, inventario bajo). */
export async function getStoreAnalytics(
  supabase: SupabaseClient,
  storeId: string,
  storeSlug: string,
): Promise<StoreAnalytics> {
  const [{ ventas, orders }, inventory] = await Promise.all([
    fetchSalesSources(supabase, storeId),
    getStoreInventory(storeSlug),
  ]);

  const ventasTotalUsd = ventas.reduce((sum, row) => sum + Number(row.monto), 0);
  const ordersTotalUsd = orders.reduce((sum, order) => sum + order.total_usd, 0);
  const totalSalesUsd = ventasTotalUsd + ordersTotalUsd;
  const transactionCount = ventas.length + orders.length;

  const dailyTotals = new Map<string, number>();

  for (const venta of ventas) {
    const dateKey = toDateKey(venta.created_at);
    dailyTotals.set(dateKey, (dailyTotals.get(dateKey) ?? 0) + Number(venta.monto));
  }

  for (const order of orders) {
    dailyTotals.set(
      toDateKey(order.created_at),
      (dailyTotals.get(toDateKey(order.created_at)) ?? 0) + order.total_usd,
    );
  }

  const weeklySales: DailySalesVolume[] = getLast7Days().map((day) => ({
    date: day.date,
    label: day.label,
    amountUsd: dailyTotals.get(day.date) ?? 0,
  }));

  const inventoryThumbById = new Map(
    inventory.products.map((product) => [product.product_id, product.thumb_url]),
  );

  const topProducts = buildProductSalesInsights(ventas, orders, inventoryThumbById);

  const lowStockProducts: LowStockProductInsight[] = inventory.products
    .filter((product) => product.available_stock < ANALYTICS_LOW_STOCK_THRESHOLD)
    .sort((a, b) => a.available_stock - b.available_stock)
    .slice(0, 8)
    .map((product) => ({
      productId: product.product_id,
      name: product.product_name,
      availableStock: product.available_stock,
      thumbUrl: product.thumb_url,
    }));

  const activeInventoryCount = inventory.products.filter(
    (product) => product.available_stock > 0,
  ).length;

  return {
    kpis: {
      totalSalesUsd,
      ordersReceived: orders.length,
      averageTicketUsd:
        transactionCount > 0 ? totalSalesUsd / transactionCount : 0,
      activeInventoryCount,
      lowStockCount: lowStockProducts.length,
    },
    weeklySales,
    topProducts,
    lowStockProducts,
  };
}
