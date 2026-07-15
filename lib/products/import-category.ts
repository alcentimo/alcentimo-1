import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/slugify";
import {
  normalizeImportCategoryName,
  normalizeProductNameKey,
} from "@/lib/products/import-sanitize";

export function categorySlugFromImportName(normalizedName: string): string {
  return slugify(normalizedName) || normalizedName.replace(/\s+/g, "-");
}

export function findDuplicateImportNames(
  rows: { nombre: string; rowNumber: number }[],
): string[] {
  const seen = new Map<string, number>();
  const errors: string[] = [];

  for (const row of rows) {
    const key = normalizeProductNameKey(row.nombre);
    const previousRow = seen.get(key);
    if (previousRow !== undefined) {
      errors.push(
        `Fila ${row.rowNumber}: nombre duplicado con la fila ${previousRow} ("${row.nombre}").`,
      );
      continue;
    }
    seen.set(key, row.rowNumber);
  }

  return errors;
}

export type ImportCategoryCache = Map<string, string>;

export function buildImportCategoryCache(
  categories: { id: string; name: string; slug: string }[],
): ImportCategoryCache {
  const cache: ImportCategoryCache = new Map();

  for (const category of categories) {
    cache.set(normalizeImportCategoryName(category.name), category.id);
    cache.set(category.slug, category.id);
  }

  return cache;
}

/** Busca por nombre/slug normalizado o crea la categoría en la tienda. */
export async function resolveOrCreateImportCategory(
  supabase: SupabaseClient,
  storeId: string,
  categoria: string,
  cache: ImportCategoryCache,
): Promise<{ categoryId?: string; error?: string }> {
  const normalizedName = normalizeImportCategoryName(categoria);
  if (!normalizedName) {
    return { error: "categoria es obligatoria" };
  }

  const cachedByName = cache.get(normalizedName);
  if (cachedByName) {
    return { categoryId: cachedByName };
  }

  const slug = categorySlugFromImportName(normalizedName);
  const cachedBySlug = cache.get(slug);
  if (cachedBySlug) {
    cache.set(normalizedName, cachedBySlug);
    return { categoryId: cachedBySlug };
  }

  const { data: existingBySlug, error: lookupError } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("store_id", storeId)
    .eq("slug", slug)
    .maybeSingle();

  if (lookupError) {
    return { error: lookupError.message };
  }

  if (existingBySlug?.id) {
    const categoryId = existingBySlug.id as string;
    cache.set(normalizedName, categoryId);
    cache.set(slug, categoryId);
    return { categoryId };
  }

  const { data: existingByName, error: nameLookupError } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("store_id", storeId)
    .ilike("name", normalizedName)
    .maybeSingle();

  if (nameLookupError) {
    return { error: nameLookupError.message };
  }

  if (existingByName?.id) {
    const categoryId = existingByName.id as string;
    cache.set(normalizedName, categoryId);
    cache.set(existingByName.slug as string, categoryId);
    return { categoryId };
  }

  const { data: created, error: insertError } = await supabase
    .from("categories")
    .insert({
      store_id: storeId,
      name: normalizedName,
      slug,
    })
    .select("id, slug")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: raced } = await supabase
        .from("categories")
        .select("id, slug")
        .eq("store_id", storeId)
        .eq("slug", slug)
        .maybeSingle();

      if (raced?.id) {
        const categoryId = raced.id as string;
        cache.set(normalizedName, categoryId);
        cache.set(slug, categoryId);
        return { categoryId };
      }
    }

    return { error: insertError.message };
  }

  const categoryId = created.id as string;
  const createdSlug = created.slug as string;
  cache.set(normalizedName, categoryId);
  cache.set(createdSlug, categoryId);

  return { categoryId };
}
