/** Productos por página en el listado del dashboard (por defecto). */
export const INVENTORY_PAGE_SIZE = 20;

/** Tamaños de página permitidos en el catálogo del dashboard. */
export const INVENTORY_PAGE_SIZE_OPTIONS = [20, 50] as const;

export type InventoryPageSize = (typeof INVENTORY_PAGE_SIZE_OPTIONS)[number];

export function parseInventoryPageSize(
  value: string | number | null | undefined,
): InventoryPageSize {
  const parsed = typeof value === "number" ? value : Number(value);
  return parsed === 50 ? 50 : INVENTORY_PAGE_SIZE;
}

/** Pedidos por lote en la lista del dashboard. */
export const ORDERS_PAGE_SIZE = 30;

/**
 * Columnas mínimas para el listado del dashboard.
 * Excluye metadata, blur_hash, category_path y otros campos pesados no usados en la tabla.
 */
export const CATALOG_LIST_SELECT = [
  "store_id",
  "store_slug",
  "product_id",
  "product_slug",
  "product_name",
  "category_name",
  "sort_order",
  "created_at",
  "default_sku",
  "stock_quantity",
  "reserved_quantity",
  "available_stock",
  "low_stock_threshold",
  "price_usd",
  "price_ves",
  "compare_at_usd",
  "compare_at_ves",
  "product_variants",
  "thumb_url",
].join(",");
