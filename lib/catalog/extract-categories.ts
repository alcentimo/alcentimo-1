import type { CatalogListItem } from "@/lib/database.types";
import { supplierCategorySortOrder } from "@/lib/supplier/categories";
import {
  getProductCategoriesForRubro,
  isCategoryAlignedWithRubro,
  normalizeStoreRubro,
  type StoreRubro,
} from "@/src/config/categories";

export interface CatalogCategoryOption {
  slug: string;
  name: string;
  /** Orden del catálogo mayorista (Mercado Oculto). */
  sortOrder?: number;
}

function compareCatalogCategories(
  a: CatalogCategoryOption,
  b: CatalogCategoryOption,
): number {
  const supplierA = supplierCategorySortOrder(a.slug);
  const supplierB = supplierCategorySortOrder(b.slug);
  if (supplierA !== supplierB) return supplierA - supplierB;

  const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return a.name.localeCompare(b.name, "es");
}

/**
 * Píldoras del catálogo público: categorías automáticas del inventario mayorista.
 * No se filtran por rubro ni por la gestión manual retirada de Ajustes.
 */
export function resolveAutomaticStorefrontCategories(
  storeCategories: CatalogCategoryOption[],
  products: CatalogListItem[] = [],
): CatalogCategoryOption[] {
  if (storeCategories.length > 0) {
    return [...storeCategories].sort(compareCatalogCategories);
  }
  return extractCatalogCategories(products);
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

  return Array.from(map.values()).sort(compareCatalogCategories);
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
        sortOrder: category.sortOrder,
      };
    })
    .sort(compareCatalogCategories);
}

/** Une nombres de la tienda con categorías que tienen productos. */
export function mergeStoreCategoriesWithProductSlugs(
  storeCategories: CatalogCategoryOption[],
  categoriesWithProducts: CatalogCategoryOption[],
): CatalogCategoryOption[] {
  if (categoriesWithProducts.length === 0) return [];

  const storeBySlug = new Map(
    storeCategories.map((category) => [category.slug, category]),
  );

  return categoriesWithProducts.map((category) => {
    const storeCategory = storeBySlug.get(category.slug);
    return {
      slug: category.slug,
      name: storeCategory?.name ?? category.name,
      sortOrder: storeCategory?.sortOrder ?? category.sortOrder,
    };
  });
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
