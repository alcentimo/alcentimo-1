import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_noStore as noStore } from "next/cache";
import { slugify } from "@/lib/slugify";
import { CUSTOM_PRODUCT_CATEGORY_VALUE } from "@/lib/products/category-selection";
import {
  getInitialCategoriesForRubro,
  getOtherRubroExclusivePresetSlugs,
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

/**
 * Inserta en `categories` solo los presets del rubro activo para ESA tienda.
 * - Scope: siempre `store_id` concreto (nunca global).
 * - Solo slugs del rubro actual (no inyecta presets de otros rubros).
 * - Idempotente: no duplica por `(store_id, slug)` ni borra categorías previas.
 */
export async function syncStoreProductCategories(
  supabase: SupabaseClient,
  storeId: string,
  rubro: StoreRubro | string | null | undefined,
): Promise<{ error?: string; inserted?: number }> {
  const trimmedStoreId = storeId.trim();
  if (!trimmedStoreId) {
    return { error: "Tienda no válida para sincronizar categorías." };
  }

  const normalizedRubro = normalizeStoreRubro(rubro);
  const presets = getInitialCategoriesForRubro(normalizedRubro);
  if (presets.length === 0) {
    return { inserted: 0 };
  }

  const presetSlugs = presets.map((item) => item.slug);
  const { data: existing, error: lookupError } = await supabase
    .from("categories")
    .select("slug")
    .eq("store_id", trimmedStoreId)
    .in("slug", presetSlugs);

  if (lookupError) {
    return { error: lookupError.message };
  }

  const existingSlugs = new Set(
    (existing ?? []).map((row) => String(row.slug ?? "").toLowerCase()),
  );
  const missing = presets.filter(
    (item) => !existingSlugs.has(item.slug.toLowerCase()),
  );

  if (missing.length === 0) {
    return { inserted: 0 };
  }

  const { data: maxRow } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("store_id", trimmedStoreId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortBase =
    typeof maxRow?.sort_order === "number" && Number.isFinite(maxRow.sort_order)
      ? maxRow.sort_order + 1
      : 0;

  const rows = missing.map((item, index) => ({
    store_id: trimmedStoreId,
    name: item.label,
    slug: item.slug,
    sort_order: sortBase + index,
    is_active: true,
  }));

  const { error: insertError } = await supabase.from("categories").insert(rows);

  if (!insertError) {
    return { inserted: rows.length };
  }

  // Carrera o slug ya creado: insertar uno a uno e ignorar 23505.
  if (insertError.code === "23505") {
    let inserted = 0;
    for (const row of rows) {
      const { error: singleError } = await supabase
        .from("categories")
        .insert(row);
      if (!singleError) {
        inserted += 1;
        continue;
      }
      if (singleError.code === "23505") continue;
      return { error: singleError.message, inserted };
    }
    return { inserted };
  }

  return { error: insertError.message };
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
  const otherRubroPresetSlugs = getOtherRubroExclusivePresetSlugs(rubro);

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

  // Las categorías propias van primero: el dueño define su estructura principal.
  return [...custom, ...suggested, ...legacyPresets];
}
