/**
 * Stock abierto: el producto/variante se ofrece sin inventario detallado.
 * Se persiste con un sentinel alto + atributo `inventory_mode=open`.
 */

export const OPEN_STOCK_QUANTITY = 999_999;
/** Tope razonable por línea en el carrito cuando el stock es abierto. */
export const OPEN_STOCK_CART_CAP = 50;

export const INVENTORY_MODE_ATTR = "inventory_mode";
export const INVENTORY_MODE_OPEN = "open";

export function isOpenInventoryMode(
  attributes?: Record<string, string> | null,
): boolean {
  return attributes?.[INVENTORY_MODE_ATTR] === INVENTORY_MODE_OPEN;
}

export function isOpenStockQuantity(
  stock: number | null | undefined,
): boolean {
  if (stock == null || !Number.isFinite(stock)) return false;
  return stock >= OPEN_STOCK_QUANTITY;
}

export function isOpenStockVariant(variant: {
  stock?: number | string | null;
  attributes?: Record<string, string> | null;
}): boolean {
  if (isOpenInventoryMode(variant.attributes)) return true;
  const raw = variant.stock;
  const n =
    typeof raw === "string" ? parseInt(raw, 10) : Number(raw ?? Number.NaN);
  return isOpenStockQuantity(n);
}

export function withOpenInventoryAttributes(
  attributes: Record<string, string>,
): Record<string, string> {
  return {
    ...attributes,
    [INVENTORY_MODE_ATTR]: INVENTORY_MODE_OPEN,
  };
}

export function resolveCartStockCap(availableStock: number): number {
  if (isOpenStockQuantity(availableStock)) return OPEN_STOCK_CART_CAP;
  return Math.max(0, availableStock);
}

/** Si es false, el catálogo no debe mostrar cantidades exactas. */
export function shouldShowExactStockQuantity(
  stock: number | null | undefined,
): boolean {
  if (stock == null || !Number.isFinite(stock) || stock <= 0) return false;
  return !isOpenStockQuantity(stock);
}
