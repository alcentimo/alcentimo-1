import type { SupabaseClient } from "@supabase/supabase-js";
import { getStoreInventory } from "@/lib/inventory";
import type { CatalogOrder } from "@/lib/orders/types";
import { getStoreOrders } from "@/lib/orders/get-store-orders";
import {
  buildDailySalesBuckets,
  computeChangePct,
  isIsoInDateRange,
  parseAnalyticsDateRange,
} from "@/lib/analytics/date-range";
import type {
  AnalyticsDateRange,
  DailySalesPoint,
  FinancialKpis,
  MetricComparison,
  ProductInsight,
  StagnantProductInsight,
  StoreAnalytics,
  StoreAnalyticsPanel,
  TrafficMetrics,
} from "@/lib/analytics/types";

const ANALYTICS_LOW_STOCK_THRESHOLD = 3;
const ANALYTICS_FETCH_LIMIT = 5000;
const STAGNANT_PRODUCT_DAYS = 30;
const WHATSAPP_CHANNEL_VALUE = "WhatsApp";

interface VentaAnalyticsRow {
  producto_id: string;
  cantidad: number;
  monto: number;
  canal_venta: string;
  created_at: string;
  products: {
    name?: string;
    product_images?: { thumb_url?: string | null; is_primary?: boolean }[];
  } | null;
}

interface ProductAccumulator {
  productId: string;
  name: string;
  unitsSold: number;
  revenueUsd: number;
  thumbUrl: string | null;
}

function toDateKey(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isCurrentMonth(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

function isToday(iso: string): boolean {
  return toDateKey(iso) === toDateKey(new Date().toISOString());
}

function pickThumbUrl(
  images: { thumb_url?: string | null; is_primary?: boolean }[] | undefined,
): string | null {
  if (!images?.length) return null;
  const primary = images.find((image) => image.is_primary) ?? images[0];
  return primary?.thumb_url ?? null;
}

function metricComparison(current: number, previous: number): MetricComparison {
  return {
    value: current,
    previousValue: previous,
    changePct: computeChangePct(current, previous),
  };
}

async function fetchSalesSources(
  supabase: SupabaseClient,
  storeId: string,
) {
  const [ventasResult, ordersResult] = await Promise.all([
    supabase
      .from("ventas")
      .select(
        `
        producto_id,
        cantidad,
        monto,
        canal_venta,
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
    getStoreOrders(storeId, { limit: ANALYTICS_FETCH_LIMIT }),
  ]);

  if (ventasResult.error) {
    throw new Error(ventasResult.error.message);
  }

  return {
    ventas: (ventasResult.data ?? []) as VentaAnalyticsRow[],
    orders: ordersResult.orders,
  };
}

function sumSalesInRange(
  ventas: VentaAnalyticsRow[],
  orders: CatalogOrder[],
  from: string,
  to: string,
): { totalUsd: number; transactionCount: number; conversionActions: number } {
  let totalUsd = 0;
  let ventasCount = 0;
  let ordersCount = 0;
  let whatsappVentasCount = 0;

  for (const venta of ventas) {
    if (!isIsoInDateRange(venta.created_at, from, to)) continue;
    totalUsd += Number(venta.monto) || 0;
    ventasCount += 1;
    if (venta.canal_venta === WHATSAPP_CHANNEL_VALUE) {
      whatsappVentasCount += 1;
    }
  }

  for (const order of orders) {
    if (!isIsoInDateRange(order.created_at, from, to)) continue;
    totalUsd += order.total_usd;
    ordersCount += 1;
  }

  return {
    totalUsd,
    transactionCount: ventasCount + ordersCount,
    conversionActions: ordersCount + whatsappVentasCount,
  };
}

function computeFinancialKpis(
  ventas: VentaAnalyticsRow[],
  orders: CatalogOrder[],
  dateRange: AnalyticsDateRange,
): FinancialKpis {
  const current = sumSalesInRange(ventas, orders, dateRange.from, dateRange.to);
  const previous = sumSalesInRange(
    ventas,
    orders,
    dateRange.previousFrom,
    dateRange.previousTo,
  );

  const currentAov =
    current.transactionCount > 0
      ? current.totalUsd / current.transactionCount
      : 0;
  const previousAov =
    previous.transactionCount > 0
      ? previous.totalUsd / previous.transactionCount
      : 0;

  let todaySalesUsd = 0;
  let monthToDateUsd = 0;

  for (const venta of ventas) {
    const amount = Number(venta.monto) || 0;
    if (isToday(venta.created_at)) todaySalesUsd += amount;
    if (isCurrentMonth(venta.created_at)) monthToDateUsd += amount;
  }

  for (const order of orders) {
    if (isToday(order.created_at)) todaySalesUsd += order.total_usd;
    if (isCurrentMonth(order.created_at)) monthToDateUsd += order.total_usd;
  }

  return {
    periodSalesUsd: metricComparison(current.totalUsd, previous.totalUsd),
    averageOrderValueUsd: metricComparison(currentAov, previousAov),
    transactionCount: metricComparison(
      current.transactionCount,
      previous.transactionCount,
    ),
    todaySalesUsd,
    monthToDateUsd,
  };
}

function accumulateProduct(
  map: Map<string, ProductAccumulator>,
  productId: string,
  name: string,
  units: number,
  revenueUsd: number,
  thumbUrl: string | null,
) {
  const current = map.get(productId);
  if (current) {
    current.unitsSold += units;
    current.revenueUsd += revenueUsd;
    if (!current.thumbUrl && thumbUrl) current.thumbUrl = thumbUrl;
    return;
  }

  map.set(productId, {
    productId,
    name,
    unitsSold: units,
    revenueUsd,
    thumbUrl,
  });
}

function buildProductInsightsForRange(
  ventas: VentaAnalyticsRow[],
  orders: CatalogOrder[],
  inventoryThumbById: Map<string, string | null>,
  from: string,
  to: string,
): ProductInsight[] {
  const productMap = new Map<string, ProductAccumulator>();

  for (const venta of ventas) {
    if (!isIsoInDateRange(venta.created_at, from, to)) continue;
    const product = venta.products;
    accumulateProduct(
      productMap,
      venta.producto_id,
      product?.name ?? "Producto",
      Number(venta.cantidad) || 0,
      Number(venta.monto) || 0,
      pickThumbUrl(product?.product_images),
    );
  }

  for (const order of orders) {
    if (!isIsoInDateRange(order.created_at, from, to)) continue;
    for (const item of order.items) {
      accumulateProduct(
        productMap,
        item.product_id,
        item.product_name,
        item.quantity,
        item.line_total_usd ?? item.quantity * item.unit_price_usd,
        null,
      );
    }
  }

  return Array.from(productMap.values()).map((product) => ({
    ...product,
    thumbUrl: product.thumbUrl ?? inventoryThumbById.get(product.productId) ?? null,
  }));
}

function buildSalesTrend(
  ventas: VentaAnalyticsRow[],
  orders: CatalogOrder[],
  dateRange: AnalyticsDateRange,
): DailySalesPoint[] {
  const buckets = buildDailySalesBuckets(dateRange.from, dateRange.to);
  const dailyTotals = new Map<string, number>();

  for (const venta of ventas) {
    if (!isIsoInDateRange(venta.created_at, dateRange.from, dateRange.to)) continue;
    const dateKey = toDateKey(venta.created_at);
    dailyTotals.set(dateKey, (dailyTotals.get(dateKey) ?? 0) + (Number(venta.monto) || 0));
  }

  for (const order of orders) {
    if (!isIsoInDateRange(order.created_at, dateRange.from, dateRange.to)) continue;
    const dateKey = toDateKey(order.created_at);
    dailyTotals.set(dateKey, (dailyTotals.get(dateKey) ?? 0) + order.total_usd);
  }

  return buckets.map((bucket) => ({
    ...bucket,
    amountUsd: dailyTotals.get(bucket.date) ?? 0,
  }));
}

function buildStagnantProducts(
  ventas: VentaAnalyticsRow[],
  orders: CatalogOrder[],
  inventoryProducts: Awaited<ReturnType<typeof getStoreInventory>>["products"],
): StagnantProductInsight[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - STAGNANT_PRODUCT_DAYS);
  cutoff.setHours(0, 0, 0, 0);
  const cutoffIso = cutoff.toISOString();

  const soldProductIds = new Set<string>();

  for (const venta of ventas) {
    if (venta.created_at < cutoffIso) continue;
    soldProductIds.add(venta.producto_id);
  }

  for (const order of orders) {
    if (order.created_at < cutoffIso) continue;
    for (const item of order.items) {
      soldProductIds.add(item.product_id);
    }
  }

  return inventoryProducts
    .filter(
      (product) =>
        product.available_stock > 0 && !soldProductIds.has(product.product_id),
    )
    .sort((a, b) => b.available_stock - a.available_stock)
    .slice(0, 8)
    .map((product) => ({
      productId: product.product_id,
      name: product.product_name,
      thumbUrl: product.thumb_url,
      availableStock: product.available_stock,
    }));
}

async function getTrafficMetrics(
  supabase: SupabaseClient,
  storeId: string,
  dateRange: AnalyticsDateRange,
  ventas: VentaAnalyticsRow[],
  orders: CatalogOrder[],
): Promise<TrafficMetrics> {
  const periodStartIso = `${dateRange.from}T00:00:00.000`;
  const periodEndIso = `${dateRange.to}T23:59:59.999`;
  const previousStartIso = `${dateRange.previousFrom}T00:00:00.000`;
  const previousEndIso = `${dateRange.previousTo}T23:59:59.999`;

  const [
    visitorsResult,
    registrationsResult,
    profilesResult,
    previousVisitorsResult,
    previousRegistrationsResult,
    previousProfilesResult,
  ] = await Promise.all([
    supabase
      .from("catalog_visits")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .gte("last_seen_at", periodStartIso)
      .lte("last_seen_at", periodEndIso),
    supabase
      .from("catalog_visits")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .not("registered_at", "is", null)
      .gte("registered_at", periodStartIso)
      .lte("registered_at", periodEndIso),
    supabase
      .from("customer_profiles")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .gte("created_at", periodStartIso)
      .lte("created_at", periodEndIso),
    supabase
      .from("catalog_visits")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .gte("last_seen_at", previousStartIso)
      .lte("last_seen_at", previousEndIso),
    supabase
      .from("catalog_visits")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .not("registered_at", "is", null)
      .gte("registered_at", previousStartIso)
      .lte("registered_at", previousEndIso),
    supabase
      .from("customer_profiles")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .gte("created_at", previousStartIso)
      .lte("created_at", previousEndIso),
  ]);

  for (const result of [
    visitorsResult,
    registrationsResult,
    profilesResult,
    previousVisitorsResult,
    previousRegistrationsResult,
    previousProfilesResult,
  ]) {
    if (result.error) throw new Error(result.error.message);
  }

  const uniqueVisitors = visitorsResult.count ?? 0;
  const previousUniqueVisitors = previousVisitorsResult.count ?? 0;
  const registrations = Math.max(
    registrationsResult.count ?? 0,
    profilesResult.count ?? 0,
  );
  const previousRegistrations = Math.max(
    previousRegistrationsResult.count ?? 0,
    previousProfilesResult.count ?? 0,
  );
  const newCustomerProfiles = profilesResult.count ?? 0;

  const currentSales = sumSalesInRange(ventas, orders, dateRange.from, dateRange.to);
  const previousSales = sumSalesInRange(
    ventas,
    orders,
    dateRange.previousFrom,
    dateRange.previousTo,
  );

  const conversionRatePct =
    uniqueVisitors > 0
      ? Math.round((currentSales.conversionActions / uniqueVisitors) * 1000) / 10
      : 0;
  const previousConversionRatePct =
    previousUniqueVisitors > 0
      ? Math.round((previousSales.conversionActions / previousUniqueVisitors) * 1000) / 10
      : 0;

  const registrationRatePct =
    uniqueVisitors > 0
      ? Math.round((registrations / uniqueVisitors) * 1000) / 10
      : 0;
  const previousRegistrationRatePct =
    previousUniqueVisitors > 0
      ? Math.round((previousRegistrations / previousUniqueVisitors) * 1000) / 10
      : 0;

  return {
    uniqueVisitors: metricComparison(uniqueVisitors, previousUniqueVisitors),
    conversionRatePct: metricComparison(conversionRatePct, previousConversionRatePct),
    conversionActions: currentSales.conversionActions,
    registrationRatePct: metricComparison(registrationRatePct, previousRegistrationRatePct),
    registrations,
    newCustomerProfiles,
    trackingEnabled: uniqueVisitors > 0 || previousUniqueVisitors > 0,
  };
}

export interface AnalyticsQueryParams {
  range?: string | null;
  from?: string | null;
  to?: string | null;
}

/** Datos para el panel de analíticas con rango de fechas configurable. */
export async function getStoreAnalyticsPanel(
  supabase: SupabaseClient,
  storeId: string,
  storeSlug: string,
  query: AnalyticsQueryParams = {},
): Promise<StoreAnalyticsPanel> {
  const dateRange = parseAnalyticsDateRange(query);

  const [{ ventas, orders }, inventory] = await Promise.all([
    fetchSalesSources(supabase, storeId),
    getStoreInventory(storeSlug),
  ]);

  const inventoryThumbById = new Map(
    inventory.products.map((product) => [product.product_id, product.thumb_url]),
  );

  const productsInRange = buildProductInsightsForRange(
    ventas,
    orders,
    inventoryThumbById,
    dateRange.from,
    dateRange.to,
  );

  const [trafficMetrics] = await Promise.all([
    getTrafficMetrics(supabase, storeId, dateRange, ventas, orders),
  ]);

  return {
    dateRange,
    financialKpis: computeFinancialKpis(ventas, orders, dateRange),
    trafficMetrics,
    salesTrend: buildSalesTrend(ventas, orders, dateRange),
    topProductsByUnits: [...productsInRange]
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5),
    topProductsByRevenue: [...productsInRange]
      .sort((a, b) => b.revenueUsd - a.revenueUsd)
      .slice(0, 5),
    stagnantProducts: buildStagnantProducts(ventas, orders, inventory.products),
  };
}

/** Tablero completo (KPIs, semanal, inventario bajo). @deprecated */
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

  const inventoryThumbById = new Map(
    inventory.products.map((product) => [product.product_id, product.thumb_url]),
  );

  const productsAllTime = buildProductInsightsForRange(
    ventas,
    orders,
    inventoryThumbById,
    "1970-01-01",
    "2999-12-31",
  );

  const lowStockProducts = inventory.products
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

  const weeklySales = buildSalesTrend(ventas, orders, {
    preset: "7d",
    from: (() => {
      const date = new Date();
      date.setDate(date.getDate() - 6);
      return toDateKey(date.toISOString());
    })(),
    to: toDateKey(new Date().toISOString()),
    label: "",
    previousFrom: "",
    previousTo: "",
    previousLabel: "",
  });

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
    topProducts: productsAllTime
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5)
      .map(({ productId, name, unitsSold, thumbUrl }) => ({
        productId,
        name,
        unitsSold,
        thumbUrl,
      })),
    lowStockProducts,
  };
}
