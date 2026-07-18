import type { CatalogListItem } from "@/lib/database.types";

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;
export const CRITICAL_STOCK_THRESHOLD = 3;

export type CatalogStockFilter = "all" | "critical";

export function getProductStockQuantity(
  product: Pick<CatalogListItem, "stock_quantity">,
): number {
  return Math.max(0, product.stock_quantity);
}

export function getLowStockThreshold(product: CatalogListItem): number {
  const threshold = product.low_stock_threshold;
  return Number.isFinite(threshold) && threshold >= 0
    ? threshold
    : DEFAULT_LOW_STOCK_THRESHOLD;
}

export function isOutOfStock(
  product: Pick<CatalogListItem, "available_stock" | "stock_quantity">,
): boolean {
  const stock = getProductStockQuantity(product);
  return stock <= 0 || product.available_stock <= 0;
}

export function isCriticalStock(
  product: Pick<CatalogListItem, "stock_quantity">,
): boolean {
  const stock = getProductStockQuantity(product);
  return stock > 0 && stock <= CRITICAL_STOCK_THRESHOLD;
}

export function isLowStock(product: CatalogListItem): boolean {
  return (
    product.available_stock > 0 &&
    product.available_stock <= getLowStockThreshold(product)
  );
}

export function matchesCriticalStockFilter(
  product: Pick<CatalogListItem, "stock_quantity">,
): boolean {
  return getProductStockQuantity(product) <= CRITICAL_STOCK_THRESHOLD;
}

export function countCriticalStockProducts(products: CatalogListItem[]): number {
  return products.filter(matchesCriticalStockFilter).length;
}

export function filterCriticalStockProducts(
  products: CatalogListItem[],
): CatalogListItem[] {
  return products
    .filter(matchesCriticalStockFilter)
    .sort((a, b) => getProductStockQuantity(a) - getProductStockQuantity(b));
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
