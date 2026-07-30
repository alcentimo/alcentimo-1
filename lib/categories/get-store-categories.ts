import { unstable_noStore as noStore } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoreCategoryRow } from "@/lib/categories/types";

export async function getStoreCategoriesForManagement(
  supabase: SupabaseClient,
  storeId: string,
): Promise<StoreCategoryRow[]> {
  noStore();

  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, name, slug, sort_order, is_active")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`No se pudieron cargar las categorías: ${error.message}`);
  }

  const rows = categories ?? [];
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id as string);
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("category_id")
    .eq("store_id", storeId)
    .eq("is_deleted", false)
    .in("category_id", ids);

  if (productsError) {
    throw new Error(
      `No se pudieron contar productos por categoría: ${productsError.message}`,
    );
  }

  const countByCategory = new Map<string, number>();
  for (const product of products ?? []) {
    const categoryId = product.category_id as string | null;
    if (!categoryId) continue;
    countByCategory.set(categoryId, (countByCategory.get(categoryId) ?? 0) + 1);
  }

  return rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active),
    product_count: countByCategory.get(row.id as string) ?? 0,
  }));
}
