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
  /** Set when the inventory query failed but was handled without throwing. */
  inventoryError?: string;
}

/** Inventario del dashboard — productos de la tienda autenticada. */
export async function getStoreInventory(
  storeSlug: string,
): Promise<StoreInventoryData> {
  try {
    const supabase = await createClient();

    const [productsResult, exchangeRate] = await Promise.all([
      supabase
        .from("catalog_list_view")
        .select("*")
        .eq("store_slug", storeSlug)
        .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false }),
      getCurrentExchangeRate().catch(() => null),
    ]);

    if (productsResult.error) {
      console.error(
        "[getStoreInventory] catalog_list_view:",
        productsResult.error.message,
      );
      return {
        products: [],
        exchangeRate,
        inventoryError: productsResult.error.message,
      };
    }

    return {
      products: (productsResult.data ?? []).map(normalizeCatalogItem),
      exchangeRate,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al cargar inventario.";
    console.error("[getStoreInventory]", message);
    return { products: [], exchangeRate: null, inventoryError: message };
  }
}
