import { createClient } from "@/lib/supabase/server";
import type { CatalogListItem, ExchangeRate } from "@/lib/database.types";
import { getCurrentExchangeRate } from "@/lib/catalog";
import {
  CATALOG_LIST_SELECT,
  INVENTORY_PAGE_SIZE,
} from "@/lib/inventory/constants";
import {
  CRITICAL_STOCK_THRESHOLD,
  type CatalogStockFilter,
} from "@/lib/inventory/stock-status";

export { INVENTORY_PAGE_SIZE } from "@/lib/inventory/constants";

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

export interface GetStoreInventoryOptions {
  limit?: number;
  offset?: number;
  stockFilter?: CatalogStockFilter;
}

export interface StoreInventoryData {
  products: CatalogListItem[];
  exchangeRate: ExchangeRate | null;
  totalCount: number;
  hasMore: boolean;
  /** Set when the inventory query failed but was handled without throwing. */
  inventoryError?: string;
}

/** Inventario del dashboard — productos de la tienda autenticada. */
export async function getStoreInventory(
  storeSlug: string,
  options?: GetStoreInventoryOptions,
): Promise<StoreInventoryData> {
  const limit = options?.limit;
  const offset = options?.offset ?? 0;
  const stockFilter = options?.stockFilter ?? "all";
  const paginated = limit != null;

  try {
    const supabase = await createClient();

    let productsQuery = supabase
      .from("catalog_list_view")
      .select(CATALOG_LIST_SELECT, paginated ? { count: "exact" } : undefined)
      .eq("store_slug", storeSlug)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (stockFilter === "critical") {
      productsQuery = productsQuery
        .lte("stock_quantity", CRITICAL_STOCK_THRESHOLD)
        .gt("stock_quantity", 0);
    }

    if (paginated) {
      productsQuery = productsQuery.range(offset, offset + limit - 1);
    }

    const [productsResult, exchangeRate] = await Promise.all([
      productsQuery,
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
        totalCount: 0,
        hasMore: false,
        inventoryError: productsResult.error.message,
      };
    }

    const products = (productsResult.data ?? []).map((row) =>
      normalizeCatalogItem(row as unknown as CatalogListItem),
    );
    const totalCount = paginated
      ? productsResult.count ?? products.length
      : products.length;

    return {
      products,
      exchangeRate,
      totalCount,
      hasMore: paginated ? offset + products.length < totalCount : false,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al cargar inventario.";
    console.error("[getStoreInventory]", message);
    return {
      products: [],
      exchangeRate: null,
      totalCount: 0,
      hasMore: false,
      inventoryError: message,
    };
  }
}
