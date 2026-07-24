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

/** Slugs de categorías que tienen al menos un producto activo en el catálogo público. */
export async function getPublicStoreCategorySlugsWithProducts(
  storeSlug: string,
): Promise<CatalogCategoryOption[]> {
  const client = getPublicServerClient();
  const normalizedSlug = storeSlug.trim().toLowerCase();

  const { data, error } = await client
    .from("catalog_list_view")
    .select("category_slug, category_name")
    .eq("store_slug", normalizedSlug);

  if (error) {
    throw new Error(
      `No se pudieron cargar las categorías con productos: ${error.message}`,
    );
  }

  const map = new Map<string, CatalogCategoryOption>();
  for (const row of data ?? []) {
    const slug = row.category_slug as string | null;
    const name = row.category_name as string | null;
    if (!slug || !name) continue;
    map.set(slug, { slug, name });
  }

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );
}
