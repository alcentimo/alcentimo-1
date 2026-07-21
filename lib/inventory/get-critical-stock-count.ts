import { createClient } from "@/lib/supabase/server";
import { CATALOG_LIST_SELECT } from "@/lib/inventory/constants";
import {
  CRITICAL_STOCK_THRESHOLD,
  countCriticalStockProducts,
} from "@/lib/inventory/stock-status";
import { getStoreInventory } from "@/lib/inventory";

/** Cuenta productos con stock_quantity <= umbral crítico (vista catálogo). */
export async function getCriticalStockCount(storeSlug: string): Promise<number> {
  if (!storeSlug.trim()) return 0;

  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("catalog_list_view")
      .select(CATALOG_LIST_SELECT, { count: "exact", head: true })
      .eq("store_slug", storeSlug)
      .lte("stock_quantity", CRITICAL_STOCK_THRESHOLD)
      .gt("stock_quantity", 0);

    if (error) {
      console.error("[getCriticalStockCount]", error.message);
      const { products } = await getStoreInventory(storeSlug, {
        stockFilter: "critical",
      });
      return countCriticalStockProducts(products);
    }

    return count ?? 0;
  } catch (error) {
    console.error("[getCriticalStockCount]", error);
    return 0;
  }
}
