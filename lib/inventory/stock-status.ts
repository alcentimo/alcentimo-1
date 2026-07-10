import type { CatalogListItem } from "@/lib/database.types";

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export function getLowStockThreshold(product: CatalogListItem): number {
  const threshold = product.low_stock_threshold;
  return Number.isFinite(threshold) && threshold >= 0
    ? threshold
    : DEFAULT_LOW_STOCK_THRESHOLD;
}

export function isOutOfStock(product: Pick<CatalogListItem, "available_stock">): boolean {
  return product.available_stock <= 0;
}

export function isLowStock(product: CatalogListItem): boolean {
  return (
    product.available_stock > 0 &&
    product.available_stock <= getLowStockThreshold(product)
  );
}

export function getInventoryAlerts(products: CatalogListItem[]): CatalogListItem[] {
  return products
    .filter((product) => isOutOfStock(product) || isLowStock(product))
    .sort((a, b) => {
      if (isOutOfStock(a) && !isOutOfStock(b)) return -1;
      if (!isOutOfStock(a) && isOutOfStock(b)) return 1;
      return a.available_stock - b.available_stock;
    });
}

export function countOutOfStock(products: CatalogListItem[]): number {
  return products.filter(isOutOfStock).length;
}

export function countLowStock(products: CatalogListItem[]): number {
  return products.filter(isLowStock).length;
}
