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

export function attachHubTrendToCatalogItems(
  products: CatalogListItem[],
  entries: DropshipLinkedCatalogEntry[],
  scores: Map<string, number>,
): CatalogListItem[] {
  if (products.length === 0 || entries.length === 0) return products;
  const supplierByProduct = new Map<string, string>();
  for (const entry of entries) {
    if (entry.supplierProductId) {
      supplierByProduct.set(entry.productId, entry.supplierProductId);
    }
  }
  if (supplierByProduct.size === 0) return products;

  return products.map((product) => {
    const supplierId = supplierByProduct.get(product.product_id);
    if (!supplierId) return product;
    return {
      ...product,
      hub_trend_score: scores.get(supplierId) ?? 0,
    };
  });
}
