import { createClient } from "@/lib/supabase/server";
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
      .select("*", { count: "exact", head: true })
      .eq("store_slug", storeSlug)
      .lte("stock_quantity", CRITICAL_STOCK_THRESHOLD);

    if (error) {
      console.error("[getCriticalStockCount]", error.message);
      const { products } = await getStoreInventory(storeSlug);
      return countCriticalStockProducts(products);
    }

    return count ?? 0;
  } catch (error) {
    console.error("[getCriticalStockCount]", error);
    return 0;
  }
}
