import { supabase } from "@/lib/supabase";
import type { CatalogListItem, ExchangeRate } from "@/lib/database.types";

export interface CatalogPageData {
  products: CatalogListItem[];
  exchangeRate: ExchangeRate | null;
}

export interface GetCatalogOptions {
  storeSlug: string;
  limit?: number;
  offset?: number;
  categorySlug?: string;
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const parsed = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCatalogItem(row: CatalogListItem): CatalogListItem {
  return {
    ...row,
    stock_quantity: toNumber(row.stock_quantity) ?? 0,
    reserved_quantity: toNumber(row.reserved_quantity) ?? 0,
    available_stock: toNumber(row.available_stock) ?? 0,
    low_stock_threshold: toNumber(row.low_stock_threshold) ?? 5,
    price_usd: toNumber(row.price_usd),
    price_ves: toNumber(row.price_ves),
    compare_at_usd: toNumber(row.compare_at_usd),
    compare_at_ves: toNumber(row.compare_at_ves),
    exchange_rate_used: toNumber(row.exchange_rate_used),
  };
}

function normalizeExchangeRate(row: ExchangeRate): ExchangeRate {
  return {
    ...row,
    rate: toNumber(row.rate) ?? 0,
  };
}

export async function getCurrentExchangeRate(): Promise<ExchangeRate | null> {
  const { data, error } = await supabase
    .from("exchange_rate")
    .select("*")
    .is("store_id", null)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? normalizeExchangeRate(data) : null;
}

/** Catálogo filtrado estrictamente por tienda (vista catalog_list_view). */
export async function getCatalogProducts(
  options: GetCatalogOptions,
): Promise<CatalogPageData> {
  const { storeSlug, limit = 24, offset = 0, categorySlug } = options;

  let query = supabase
    .from("catalog_list_view")
    .select("*")
    .eq("store_slug", storeSlug)
    .order("is_featured", { ascending: false })
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (categorySlug) {
    query = query.eq("category_slug", categorySlug);
  }

  const [productsResult, exchangeRate] = await Promise.all([
    query,
    getCurrentExchangeRate(),
  ]);

  if (productsResult.error) {
    throw new Error(productsResult.error.message);
  }

  return {
    products: (productsResult.data ?? []).map(normalizeCatalogItem),
    exchangeRate,
  };
}
