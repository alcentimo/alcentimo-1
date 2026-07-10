import { createClient } from "@/lib/supabase/server";
import type { CatalogListItem, ExchangeRate } from "@/lib/database.types";
import { getCurrentExchangeRate } from "@/lib/catalog";

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

export interface StoreInventoryData {
  products: CatalogListItem[];
  exchangeRate: ExchangeRate | null;
}

/** Inventario del dashboard — productos de la tienda autenticada. */
export async function getStoreInventory(
  storeSlug: string,
): Promise<StoreInventoryData> {
  const supabase = await createClient();

  const [productsResult, exchangeRate] = await Promise.all([
    supabase
      .from("catalog_list_view")
      .select("*")
      .eq("store_slug", storeSlug)
      .order("updated_at", { ascending: false }),
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
