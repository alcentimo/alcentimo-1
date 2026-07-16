import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/slugify";
import { CUSTOM_PRODUCT_CATEGORY_VALUE } from "@/lib/products/category-selection";
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

/** Asegura que existan filas en `categories` para las opciones sugeridas del rubro. */
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

async function findOrCreateStoreCategory(
  supabase: SupabaseClient,
  storeId: string,
  categoryName: string,
): Promise<{ categoryId?: string; categorySlug?: string; error?: string }> {
  const name = categoryName.trim();
  if (!name) {
    return { error: "Escribe el nombre de la categoría personalizada." };
  }

  const normalizedSlug = slugify(name);
  if (!normalizedSlug) {
    return { error: "La categoría personalizada no es válida." };
  }

  const { data: existing, error: lookupError } = await supabase
    .from("categories")
    .select("id, slug")
    .eq("store_id", storeId)
    .eq("slug", normalizedSlug)
    .maybeSingle();

  if (lookupError) return { error: lookupError.message };
  if (existing?.id) {
    return {
      categoryId: existing.id as string,
      categorySlug: existing.slug as string,
    };
  }

  const { data: created, error: insertError } = await supabase
    .from("categories")
    .insert({
      store_id: storeId,
      name,
      slug: normalizedSlug,
    })
    .select("id, slug")
    .single();

  if (insertError) return { error: insertError.message };
  return {
    categoryId: created.id as string,
    categorySlug: created.slug as string,
  };
}

export async function resolveProductCategoryId(
  supabase: SupabaseClient,
  storeId: string,
  rubro: StoreRubro,
  categorySlug: string,
  customCategoryName?: string,
): Promise<{ categoryId?: string; categorySlug?: string; error?: string }> {
  if (categorySlug === CUSTOM_PRODUCT_CATEGORY_VALUE) {
    return findOrCreateStoreCategory(supabase, storeId, customCategoryName ?? "");
  }

  const normalizedSlug = slugify(categorySlug) || categorySlug.trim().toLowerCase();
  if (!normalizedSlug) {
    return { error: "Selecciona una categoría de producto." };
  }

  const option = getProductCategoriesForRubro(rubro).find(
    (item) => item.slug === normalizedSlug,
  );

  if (option) {
    await syncStoreProductCategories(supabase, storeId, rubro);

    const { data: category, error: lookupError } = await supabase
      .from("categories")
      .select("id")
      .eq("store_id", storeId)
      .eq("slug", normalizedSlug)
      .maybeSingle();

    if (lookupError) return { error: lookupError.message };
    if (category?.id) {
      return { categoryId: category.id as string, categorySlug: normalizedSlug };
    }

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
    return { categoryId: created.id as string, categorySlug: normalizedSlug };
  }

  const { data: storeCategory, error: storeLookupError } = await supabase
    .from("categories")
    .select("id, slug")
    .eq("store_id", storeId)
    .eq("slug", normalizedSlug)
    .maybeSingle();

  if (storeLookupError) return { error: storeLookupError.message };
  if (storeCategory?.id) {
    return {
      categoryId: storeCategory.id as string,
      categorySlug: storeCategory.slug as string,
    };
  }

  return { error: "Categoría no válida para el rubro de tu tienda." };
}

export function getProductCategoryOptionsForStore(
  rubro: StoreRubro,
): ProductCategoryOption[] {
  return getProductCategoriesForRubro(rubro);
}

export function mergeStoreProductCategories(
  rubro: StoreRubro,
  storeCategories: { slug: string; name: string }[],
): ProductCategoryOption[] {
  const suggested = getProductCategoriesForRubro(rubro);
  const suggestedSlugs = new Set(suggested.map((item) => item.slug));

  const custom = storeCategories
    .filter((item) => !suggestedSlugs.has(item.slug))
    .map((item) => ({
      slug: item.slug,
      label: item.name,
      campos: [] as string[],
      isCustom: true,
    }));

  return [...suggested, ...custom];
}
