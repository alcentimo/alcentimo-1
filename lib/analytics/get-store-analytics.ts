import type { SupabaseClient } from "@supabase/supabase-js";
import { getStoreInventory } from "@/lib/inventory";
import { getStoreOrders } from "@/lib/orders/get-store-orders";
import type {
  DailySalesVolume,
  LowStockProductInsight,
  StoreAnalytics,
  TopProductInsight,
} from "@/lib/analytics/types";

const ANALYTICS_LOW_STOCK_THRESHOLD = 3;
const ANALYTICS_FETCH_LIMIT = 5000;

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

export async function getStoreAnalytics(
  supabase: SupabaseClient,
  storeId: string,
  storeSlug: string,
): Promise<StoreAnalytics> {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const [ventasResult, orders, inventory] = await Promise.all([
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
    getStoreInventory(storeSlug),
  ]);

  if (ventasResult.error) {
    throw new Error(ventasResult.error.message);
  }

  const ventas = (ventasResult.data ?? []) as VentaAnalyticsRow[];
  const ventasTotalUsd = ventas.reduce((sum, row) => sum + Number(row.monto), 0);
  const ordersTotalUsd = orders.reduce((sum, order) => sum + order.total_usd, 0);
  const totalSalesUsd = ventasTotalUsd + ordersTotalUsd;
  const transactionCount = ventas.length + orders.length;

  const productSales = new Map<string, TopProductInsight>();
  const dailyTotals = new Map<string, number>();

  for (const venta of ventas) {
    const product = venta.products;
    const name = product?.name ?? "Producto";
    const thumbUrl = pickThumbUrl(product?.product_images);
    accumulateProductSales(
      productSales,
      venta.producto_id,
      name,
      Number(venta.cantidad) || 0,
      thumbUrl,
    );

    const dateKey = toDateKey(venta.created_at);
    dailyTotals.set(dateKey, (dailyTotals.get(dateKey) ?? 0) + Number(venta.monto));
  }

  for (const order of orders) {
    dailyTotals.set(
      toDateKey(order.created_at),
      (dailyTotals.get(toDateKey(order.created_at)) ?? 0) + order.total_usd,
    );

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

  const weeklySales: DailySalesVolume[] = getLast7Days().map((day) => ({
    date: day.date,
    label: day.label,
    amountUsd: dailyTotals.get(day.date) ?? 0,
  }));

  const topProducts = Array.from(productSales.values())
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 5);

  const inventoryThumbById = new Map(
    inventory.products.map((product) => [product.product_id, product.thumb_url]),
  );

  for (const product of topProducts) {
    if (!product.thumbUrl) {
      product.thumbUrl = inventoryThumbById.get(product.productId) ?? null;
    }
  }

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
