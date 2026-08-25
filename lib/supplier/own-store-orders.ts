import type { CatalogOrder } from "@/lib/orders/types";

/** Pedidos de la vitrina propia: sin líneas importadas del hub mayorista. */
export function isOwnBrandStorefrontOrder(order: CatalogOrder): boolean {
  if (!order.items.length) return false;
  return order.items.every((item) => !item.supplier_product_id);
}

export function filterOwnBrandStorefrontOrders(
  orders: CatalogOrder[],
): CatalogOrder[] {
  return orders.filter(isOwnBrandStorefrontOrder);
}
