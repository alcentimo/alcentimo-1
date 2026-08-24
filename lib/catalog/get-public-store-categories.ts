import type { CatalogCategoryOption } from "@/lib/catalog/extract-categories";
import { listDropshipLinkedCatalogEntriesForStoreId } from "@/lib/dropship/linked-catalog";
import { withPublicCatalogCache } from "@/lib/catalog/public-catalog-cache";
import {
  SUPPLIER_PRODUCT_CATEGORIES,
  normalizeSupplierProductCategory,
  supplierCategoryLabel,
} from "@/lib/supplier/categories";

async function loadPublicStoreCategoriesUncached(
  storeId: string,
): Promise<CatalogCategoryOption[]> {
  const entries = await listDropshipLinkedCatalogEntriesForStoreId(storeId, {
    publicOnly: true,
  });

  const present = new Set(
    entries.map((entry) => normalizeSupplierProductCategory(entry.supplierCategory)),
  );

  return SUPPLIER_PRODUCT_CATEGORIES.filter((item) => present.has(item.value)).map(
    (item, index) => ({
      slug: item.value,
      name: supplierCategoryLabel(item.value),
      sortOrder: index,
    }),
  );
}

/**
 * Categorías del catálogo público: se generan solas a partir de los productos
 * mayoristas (Mercado Oculto) que el dropshipper tiene en su inventario.
 */
export async function getPublicStoreCategories(
  storeId: string,
): Promise<CatalogCategoryOption[]> {
  const id = storeId.trim();
  if (!id) return [];
  return withPublicCatalogCache(
    ["public-store-categories-v3", id],
    { storeId: id },
    () => loadPublicStoreCategoriesUncached(id),
  );
}

/** @deprecated Usar getPublicStoreCategories — ya solo incluye categorías con productos. */
export async function getPublicStoreCategorySlugsWithProducts(
  storeId: string,
): Promise<CatalogCategoryOption[]> {
  return getPublicStoreCategories(storeId);
}
