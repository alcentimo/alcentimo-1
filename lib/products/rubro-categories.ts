import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_noStore as noStore } from "next/cache";
import { slugify } from "@/lib/slugify";
import { CUSTOM_PRODUCT_CATEGORY_VALUE } from "@/lib/products/category-selection";
import {
  STORE_RUBRO_CONFIGS,
  getProductCategoriesForRubro,
  normalizeStoreRubro,
  type ProductCategoryOption,
  type StoreRubro,
} from "@/src/config/categories";

export async function getStoreRubroTienda(
  supabase: SupabaseClient,
  storeId: string,
): Promise<StoreRubro> {
  noStore();
  const { data, error } = await supabase
    .from("stores")
    .select("rubro_tienda")
    .eq("id", storeId)
    .maybeSingle();

  if (error || !data) return normalizeStoreRubro(null);
  return normalizeStoreRubro(data.rubro_tienda as string | null);
}

/** @deprecated Ya no se insertan presets vacíos al crear o cambiar rubro. */
export async function syncStoreProductCategories(
  _supabase: SupabaseClient,
  _storeId: string,
  _rubro: StoreRubro,
): Promise<{ error?: string }> {
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

  /** Slugs de presets de otros rubros (quedan tras un cambio de giro). */
  const otherRubroPresetSlugs = new Set(
    STORE_RUBRO_CONFIGS.filter((config) => config.rubro !== rubro).flatMap((config) =>
      config.categorias.map((category) => category.slug),
    ),
  );

  const custom = storeCategories
    .filter((item) => !suggestedSlugs.has(item.slug))
    .filter((item) => !otherRubroPresetSlugs.has(item.slug))
    .map((item) => ({
      slug: item.slug,
      label: item.name,
      campos: [] as string[],
      isCustom: true,
    }));

  /** Presets de rubros anteriores: conservan categorías de productos ya creados. */
  const legacyPresets = storeCategories
    .filter((item) => otherRubroPresetSlugs.has(item.slug))
    .map((item) => ({
      slug: item.slug,
      label: item.name,
      campos: [] as string[],
      isLegacy: true,
    }));

  return [...suggested, ...legacyPresets, ...custom];
}
