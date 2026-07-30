import type { CatalogListItem } from "@/lib/database.types";
import {
  getProductCategoriesForRubro,
  isCategoryAlignedWithRubro,
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
  const officialLabelBySlug = new Map(
    getProductCategoriesForRubro(rubro).map((category) => [
      category.slug,
      category.label,
    ]),
  );

  return categories
    .filter((category) =>
      isCategoryAlignedWithRubro(category.slug, category.name, rubro),
    )
    .map((category) => {
      const slug = category.slug.trim().toLowerCase();
      return {
        slug,
        name: officialLabelBySlug.get(slug) ?? category.name,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
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

/**
 * Categorías visibles en el catálogo público:
 * solo las que tienen productos activos y encajan con el rubro de la tienda.
 *
 * Si el servidor ya envió `storeCategories` filtradas y `categoriesWithProducts`
 * no está vacío, no re-expandimos desde la 1ª página de productos (evita chips
 * de otros rubros presentes en productos huérfanos).
 */
export function resolveStorefrontCatalogCategories(
  storeCategories: CatalogCategoryOption[],
  categoriesWithProducts: CatalogCategoryOption[],
  rubroInput: StoreRubro | string | null | undefined,
  products: CatalogListItem[] = [],
): CatalogCategoryOption[] {
  const rubro = normalizeStoreRubro(rubroInput);

  // Lista ya filtrada en servidor: solo revalidar alineación, sin fallback a products.
  if (storeCategories.length > 0 && categoriesWithProducts === storeCategories) {
    return filterCatalogCategoriesForRubro(storeCategories, rubro);
  }

  if (storeCategories.length > 0 && categoriesWithProducts.length > 0) {
    const merged = mergeStoreCategoriesWithProductSlugs(
      storeCategories,
      categoriesWithProducts,
    );
    return filterCatalogCategoriesForRubro(merged, rubro);
  }

  if (categoriesWithProducts.length > 0) {
    return filterCatalogCategoriesForRubro(categoriesWithProducts, rubro);
  }

  // Último recurso (p. ej. preview sin lista de servidor).
  return filterCatalogCategoriesForRubro(
    extractCatalogCategories(products),
    rubro,
  );
}

/** @deprecated Usar resolveStorefrontCatalogCategories */
export function resolvePublicCatalogCategories(
  storeCategories: CatalogCategoryOption[],
  products: CatalogListItem[],
  rubro?: StoreRubro | string | null,
): CatalogCategoryOption[] {
  return resolveStorefrontCatalogCategories(
    storeCategories,
    extractCatalogCategories(products),
    rubro,
    products,
  );
}
