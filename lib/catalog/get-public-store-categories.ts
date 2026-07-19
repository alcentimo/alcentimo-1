import type { CatalogCategoryOption } from "@/lib/catalog/extract-categories";
import { getPublicServerClient } from "@/lib/supabase/public-server";

/** Categorías activas configuradas para la tienda (público). */
export async function getPublicStoreCategories(
  storeId: string,
): Promise<CatalogCategoryOption[]> {
  const client = getPublicServerClient();

  const { data, error } = await client
    .from("categories")
    .select("slug, name")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(
      `No se pudieron cargar las categorías públicas: ${error.message}`,
    );
  }

  return (data ?? []).map((item) => ({
    slug: item.slug as string,
    name: item.name as string,
  }));
}
