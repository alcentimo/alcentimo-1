import { unstable_noStore as noStore } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoreCategoryRow } from "@/lib/categories/types";
import {
  isStoreCategoryVisibleForRubro,
  normalizeStoreRubro,
  type StoreRubro,
} from "@/src/config/categories";

export async function getStoreCategoriesForManagement(
  supabase: SupabaseClient,
  storeId: string,
  rubro?: StoreRubro | string | null,
): Promise<StoreCategoryRow[]> {
  noStore();

  const trimmedStoreId = storeId.trim();
  if (!trimmedStoreId) {
    throw new Error("Tienda no válida para cargar categorías.");
  }

  let activeRubro = normalizeStoreRubro(rubro);
  if (rubro == null || String(rubro).trim() === "") {
    const { data: storeRow, error: storeError } = await supabase
      .from("stores")
      .select("rubro_tienda")
      .eq("id", trimmedStoreId)
      .maybeSingle();

    if (storeError) {
      throw new Error(
        `No se pudo leer el rubro de la tienda: ${storeError.message}`,
      );
    }
    activeRubro = normalizeStoreRubro(
      (storeRow?.rubro_tienda as string | null) ?? null,
    );
  }

  // Aislamiento estricto: solo filas de esta tienda.
  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, name, slug, sort_order, is_active")
    .eq("store_id", trimmedStoreId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`No se pudieron cargar las categorías: ${error.message}`);
  }

  const rows = (categories ?? []).filter((row) =>
    isStoreCategoryVisibleForRubro(String(row.slug ?? ""), activeRubro),
  );

  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id as string);
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("category_id")
    .eq("store_id", trimmedStoreId)
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
