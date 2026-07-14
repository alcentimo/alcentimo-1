import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/slugify";
import {
  getProductCategoriesForRubro,
  normalizeStoreRubro,
  type ProductCategoryOption,
  type StoreRubro,
} from "@/src/config/categories";

export async function getStoreRubroTienda(
  supabase: SupabaseClient,
  storeId: string,
): Promise<StoreRubro> {
  const { data, error } = await supabase
    .from("stores")
    .select("rubro_tienda")
    .eq("id", storeId)
    .maybeSingle();

  if (error || !data) return normalizeStoreRubro(null);
  return normalizeStoreRubro(data.rubro_tienda as string | null);
}

/** Asegura que existan filas en `categories` para las opciones del rubro. */
export async function syncStoreProductCategories(
  supabase: SupabaseClient,
  storeId: string,
  rubro: StoreRubro,
): Promise<{ error?: string }> {
  const options = getProductCategoriesForRubro(rubro);

  for (const option of options) {
    const { data: existing, error: lookupError } = await supabase
      .from("categories")
      .select("id")
      .eq("store_id", storeId)
      .eq("slug", option.slug)
      .maybeSingle();

    if (lookupError) return { error: lookupError.message };
    if (existing) continue;

    const { error: insertError } = await supabase.from("categories").insert({
      store_id: storeId,
      name: option.label,
      slug: option.slug,
    });

    if (insertError) return { error: insertError.message };
  }

  return {};
}

export async function resolveProductCategoryId(
  supabase: SupabaseClient,
  storeId: string,
  rubro: StoreRubro,
  categorySlug: string,
): Promise<{ categoryId?: string; error?: string }> {
  const normalizedSlug = slugify(categorySlug) || categorySlug.trim().toLowerCase();
  if (!normalizedSlug) {
    return { error: "Selecciona una categoría de producto." };
  }

  const option = getProductCategoriesForRubro(rubro).find(
    (item) => item.slug === normalizedSlug,
  );
  if (!option) {
    return { error: "Categoría no válida para el rubro de tu tienda." };
  }

  await syncStoreProductCategories(supabase, storeId, rubro);

  const { data: category, error: lookupError } = await supabase
    .from("categories")
    .select("id")
    .eq("store_id", storeId)
    .eq("slug", normalizedSlug)
    .maybeSingle();

  if (lookupError) return { error: lookupError.message };
  if (category?.id) return { categoryId: category.id as string };

  const { data: created, error: insertError } = await supabase
    .from("categories")
    .insert({
      store_id: storeId,
      name: option.label,
      slug: normalizedSlug,
    })
    .select("id")
    .single();

  if (insertError) return { error: insertError.message };
  return { categoryId: created.id as string };
}

export function getProductCategoryOptionsForStore(
  rubro: StoreRubro,
): ProductCategoryOption[] {
  return getProductCategoriesForRubro(rubro);
}
