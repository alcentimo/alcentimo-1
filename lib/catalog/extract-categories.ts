import type { CatalogListItem } from "@/lib/database.types";
import {
  getOtherRubroExclusivePresetSlugs,
  getProductCategoriesForRubro,
  normalizeStoreRubro,
  type StoreRubro,
} from "@/src/config/categories";

export interface CatalogCategoryOption {
  slug: string;
  name: string;
}

export function extractCatalogCategories(
  products: CatalogListItem[],
): CatalogCategoryOption[] {
  const map = new Map<string, CatalogCategoryOption>();

  for (const product of products) {
    if (!product.category_slug || !product.category_name) continue;
    map.set(product.category_slug, {
      slug: product.category_slug,
      name: product.category_name,
    });
  }

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );
}

/** Filtra y renombra categorías públicas según el rubro de la tienda. */
export function filterCatalogCategoriesForRubro(
  categories: CatalogCategoryOption[],
  rubroInput: StoreRubro | string | null | undefined,
): CatalogCategoryOption[] {
  const rubro = normalizeStoreRubro(rubroInput);
  const blocked = getOtherRubroExclusivePresetSlugs(rubro);
  const officialLabelBySlug = new Map(
    getProductCategoriesForRubro(rubro).map((category) => [
      category.slug,
      category.label,
    ]),
  );

  return categories
    .filter((category) => !blocked.has(category.slug.trim().toLowerCase()))
    .map((category) => {
      const slug = category.slug.trim().toLowerCase();
      return {
        slug,
        name: officialLabelBySlug.get(slug) ?? category.name,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/** Solo categorías con al menos un producto activo en el catálogo. */
export function resolvePublicCatalogCategories(
  storeCategories: CatalogCategoryOption[],
  products: CatalogListItem[],
  rubro?: StoreRubro | string | null,
): CatalogCategoryOption[] {
  const merged = mergeStoreCategoriesWithProductSlugs(
    storeCategories,
    extractCatalogCategories(products),
  );

  if (rubro == null) return merged;
  return filterCatalogCategoriesForRubro(merged, rubro);
}

/** Une nombres de la tienda con categorías que tienen productos. */
export function mergeStoreCategoriesWithProductSlugs(
  storeCategories: CatalogCategoryOption[],
  categoriesWithProducts: CatalogCategoryOption[],
): CatalogCategoryOption[] {
  if (categoriesWithProducts.length === 0) return [];

  const nameBySlug = new Map(
    storeCategories.map((category) => [category.slug, category.name]),
  );

  return categoriesWithProducts.map((category) => ({
    slug: category.slug,
    name: nameBySlug.get(category.slug) ?? category.name,
  }));
}
