import type { CatalogOrder } from "@/lib/orders/types";

/** True si el pedido del catálogo incluye al menos una línea dropshipping. */
export function catalogOrderHasDropshipLines(
  order: Pick<CatalogOrder, "items">,
): boolean {
  return order.items.some(
    (item) =>
      typeof item.supplier_product_id === "string" &&
      Boolean(item.supplier_product_id),
  );
}
