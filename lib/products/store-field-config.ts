import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slugify";
import {
  getCategoryConfigByNombre,
  getCategoryLabelForNombre,
  getExtraFieldsForCategoryNombre,
} from "@/src/config/categories";

export interface StoreProductFieldConfig {
  /** Slug del rubro de la tienda (categoría raíz del onboarding). */
  categorySlug: string | null;
  /** Etiqueta legible del rubro. */
  categoryLabel: string | null;
  /** Nombres de campos extra a renderizar en el formulario. */
  fieldLabels: string[];
}

function resolveConfigFromSlug(slug: string): StoreProductFieldConfig {
  const config = getCategoryConfigByNombre(slug);
  if (config) {
    return {
      categorySlug: config.nombre,
      categoryLabel: config.label,
      fieldLabels: config.campos,
    };
  }

  return {
    categorySlug: slug,
    categoryLabel: slug,
    fieldLabels: getExtraFieldsForCategoryNombre(slug),
  };
}

/**
 * Rubro de la tienda: primera categoría creada (onboarding), excluyendo "general".
 */
export async function getStoreProductFieldConfig(
  storeId: string,
): Promise<StoreProductFieldConfig> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("slug, name, created_at")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error || !data?.length) {
    return { categorySlug: null, categoryLabel: null, fieldLabels: [] };
  }

  const businessCategory =
    data.find((row) => row.slug !== "general") ?? data[0];

  const slug = String(businessCategory.slug ?? "").trim();
  if (!slug) {
    return { categorySlug: null, categoryLabel: null, fieldLabels: [] };
  }

  const resolved = resolveConfigFromSlug(slug);

  if (resolved.fieldLabels.length > 0) {
    return resolved;
  }

  // Fallback: intentar por nombre visible (rubros personalizados "Otros")
  const nameSlug = slugify(String(businessCategory.name ?? ""));
  if (nameSlug && nameSlug !== slug) {
    const byName = resolveConfigFromSlug(nameSlug);
    if (byName.fieldLabels.length > 0) {
      return {
        ...byName,
        categorySlug: nameSlug,
        categoryLabel:
          getCategoryLabelForNombre(nameSlug) ??
          String(businessCategory.name ?? nameSlug),
      };
    }
  }

  return {
    categorySlug: slug,
    categoryLabel: String(businessCategory.name ?? slug),
    fieldLabels: [],
  };
}
