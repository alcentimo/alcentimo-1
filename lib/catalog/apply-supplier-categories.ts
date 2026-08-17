import type { CatalogListItem } from "@/lib/database.types";
import type { DropshipLinkedCatalogEntry } from "@/lib/dropship/linked-catalog";
import {
  supplierCategoryLabel,
  type SupplierProductCategory,
} from "@/lib/supplier/categories";

export function applySupplierCategoriesToCatalogItems(
  products: CatalogListItem[],
  entries:
    | DropshipLinkedCatalogEntry[]
    | Map<string, SupplierProductCategory>,
): CatalogListItem[] {
  const categoryByProductId =
    entries instanceof Map
      ? entries
      : new Map(entries.map((entry) => [entry.productId, entry.supplierCategory]));

  if (categoryByProductId.size === 0) return products;

  return products.map((product) => {
    const supplierCategory = categoryByProductId.get(product.product_id);
    if (!supplierCategory) return product;
    return {
      ...product,
      category_slug: supplierCategory,
      category_name: supplierCategoryLabel(supplierCategory),
    };
  });
}
