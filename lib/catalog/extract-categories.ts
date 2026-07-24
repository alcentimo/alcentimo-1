import type { CatalogListItem } from "@/lib/database.types";

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

/** Solo categorías con al menos un producto activo en el catálogo. */
export function resolvePublicCatalogCategories(
  storeCategories: CatalogCategoryOption[],
  products: CatalogListItem[],
): CatalogCategoryOption[] {
  return mergeStoreCategoriesWithProductSlugs(
    storeCategories,
    extractCatalogCategories(products),
  );
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
