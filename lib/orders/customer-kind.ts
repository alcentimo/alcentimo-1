import type { CatalogOrder } from "@/lib/orders/types";

export type OrderCustomerKind = "guest" | "registered";

export function getOrderCustomerKind(
  order: Pick<CatalogOrder, "customer_user_id">,
): OrderCustomerKind {
  return order.customer_user_id?.trim() ? "registered" : "guest";
}

export function getOrderCustomerKindLabel(kind: OrderCustomerKind): string {
  return kind === "registered" ? "Registrado" : "Invitado";
}

export function getOrderCustomerKindHint(kind: OrderCustomerKind): string {
  return kind === "registered"
    ? "Cliente con cuenta en tu tienda"
    : "Compra rápida sin cuenta (WhatsApp)";
}
