import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getAlcentimoLocalDate,
  getAlcentimoMonthStart,
  LANDING_PAGE_TARGET_KEY,
  storePageVisitTargetKey,
} from "@/lib/analytics/page-visit-keys";

export interface CatalogVisitStats {
  todayUniqueVisitors: number;
  monthUniqueVisitors: number;
  totalUniqueVisitors: number;
  todayPageViews: number;
  monthPageViews: number;
  totalPageViews: number;
  topProduct: {
    productId: string;
    name: string;
    views: number;
  } | null;
}

export interface LandingVisitStats {
  totalUniqueVisitors: number;
  monthUniqueVisitors: number;
  totalPageViews: number;
  monthPageViews: number;
}

async function sumVisitRows(
  supabase: SupabaseClient,
  filters: {
    targetKey?: string;
    storeId?: string;
    fromDate?: string;
    toDate?: string;
  },
): Promise<{ uniqueVisitors: number; pageViews: number }> {
  let query = supabase
    .from("page_visit_daily")
    .select("unique_visitors, page_views");

  if (filters.targetKey) {
    query = query.eq("target_key", filters.targetKey);
  }
  if (filters.storeId) {
    query = query.eq("store_id", filters.storeId);
  }
  if (filters.fromDate) {
    query = query.gte("visit_date", filters.fromDate);
  }
  if (filters.toDate) {
    query = query.lte("visit_date", filters.toDate);
  }

  const { data, error } = await query;
  if (error) {
    // Tabla aún no migrada o sin permisos: degradar a ceros.
    return { uniqueVisitors: 0, pageViews: 0 };
  }

  let uniqueVisitors = 0;
  let pageViews = 0;
  for (const row of data ?? []) {
    uniqueVisitors += Number(row.unique_visitors) || 0;
    pageViews += Number(row.page_views) || 0;
  }
  return { uniqueVisitors, pageViews };
}

/** Stats de visitas del catálogo para el panel del comerciante. */
export async function getCatalogVisitStats(
  supabase: SupabaseClient,
  storeId: string,
): Promise<CatalogVisitStats> {
  const today = getAlcentimoLocalDate();
  const monthStart = getAlcentimoMonthStart();
  const targetKey = storePageVisitTargetKey(storeId);

  const [todayStats, monthStats, totalStats, topProduct] = await Promise.all([
    sumVisitRows(supabase, { targetKey, storeId, fromDate: today, toDate: today }),
    sumVisitRows(supabase, {
      targetKey,
      storeId,
      fromDate: monthStart,
      toDate: today,
    }),
    sumVisitRows(supabase, { targetKey, storeId }),
    getTopViewedProduct(supabase, storeId, monthStart, today),
  ]);

  return {
    todayUniqueVisitors: todayStats.uniqueVisitors,
    monthUniqueVisitors: monthStats.uniqueVisitors,
    totalUniqueVisitors: totalStats.uniqueVisitors,
    todayPageViews: todayStats.pageViews,
    monthPageViews: monthStats.pageViews,
    totalPageViews: totalStats.pageViews,
    topProduct,
  };
}

async function getTopViewedProduct(
  supabase: SupabaseClient,
  storeId: string,
  fromDate: string,
  toDate: string,
): Promise<CatalogVisitStats["topProduct"]> {
  const { data: viewRows, error } = await supabase
    .from("catalog_product_view_daily")
    .select("product_id, views")
    .eq("store_id", storeId)
    .gte("visit_date", fromDate)
    .lte("visit_date", toDate);

  if (error || !viewRows?.length) return null;

  const viewsByProduct = new Map<string, number>();
  for (const row of viewRows) {
    viewsByProduct.set(
      row.product_id,
      (viewsByProduct.get(row.product_id) ?? 0) + (Number(row.views) || 0),
    );
  }

  let topId: string | null = null;
  let topViews = 0;
  for (const [productId, views] of viewsByProduct) {
    if (views > topViews) {
      topId = productId;
      topViews = views;
    }
  }
  if (!topId || topViews <= 0) return null;

  const { data: product } = await supabase
    .from("products")
    .select("id, name")
    .eq("id", topId)
    .maybeSingle();

  if (!product) {
    return { productId: topId, name: "Producto", views: topViews };
  }

  return {
    productId: product.id,
    name: product.name,
    views: topViews,
  };
}

/** Stats de visitas a alcentimo.com (landing). */
export async function getLandingVisitStats(
  supabase: SupabaseClient,
): Promise<LandingVisitStats> {
  const today = getAlcentimoLocalDate();
  const monthStart = getAlcentimoMonthStart();

  const [monthStats, totalStats] = await Promise.all([
    sumVisitRows(supabase, {
      targetKey: LANDING_PAGE_TARGET_KEY,
      fromDate: monthStart,
      toDate: today,
    }),
    sumVisitRows(supabase, { targetKey: LANDING_PAGE_TARGET_KEY }),
  ]);

  return {
    totalUniqueVisitors: totalStats.uniqueVisitors,
    monthUniqueVisitors: monthStats.uniqueVisitors,
    totalPageViews: totalStats.pageViews,
    monthPageViews: monthStats.pageViews,
  };
}

/** Totales de visitas por store_id (toda la historia). */
export async function getStoreVisitTotalsByStoreIds(
  supabase: SupabaseClient,
  storeIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (storeIds.length === 0) return result;

  const { data, error } = await supabase
    .from("page_visit_daily")
    .select("store_id, unique_visitors")
    .in("store_id", storeIds);

  if (error || !data) return result;

  for (const row of data) {
    if (!row.store_id) continue;
    result.set(
      row.store_id,
      (result.get(row.store_id) ?? 0) + (Number(row.unique_visitors) || 0),
    );
  }
  return result;
}
