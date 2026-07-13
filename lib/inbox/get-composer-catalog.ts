import { createClient } from "@/lib/supabase/server";
import type { ComposerCatalogProduct } from "@/lib/inbox/composer-catalog-types";

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const parsed = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : null;
}

export async function getComposerCatalogProducts(
  storeSlug: string,
  limit = 12,
): Promise<ComposerCatalogProduct[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("catalog_list_view")
    .select("product_id, product_name, price_usd, available_stock")
    .eq("store_slug", storeSlug)
    .gt("available_stock", 0)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.product_id,
    name: row.product_name,
    priceUsd: toNumber(row.price_usd),
  }));
}
