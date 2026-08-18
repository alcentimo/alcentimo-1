import type { CatalogOrder } from "@/lib/orders/types";
import type { ShippingCarrierKey } from "@/lib/store-settings/types";
import { getShippingMethod, isNationalCarrierKey } from "@/src/config/shipping-methods";

type OrderShippingDisplay = Pick<
  CatalogOrder,
  | "fulfillment_type"
  | "shipping_method"
  | "shipping_branch_name"
  | "delivery_address"
>;

export function getOrderFulfillmentLabel(
  order: Pick<OrderShippingDisplay, "fulfillment_type" | "delivery_address">,
): string | null {
  if (order.fulfillment_type === "pickup") {
    return order.delivery_address ? "Punto de encuentro" : "Retiro coordinado";
  }
  if (order.fulfillment_type === "delivery") {
    return order.delivery_address?.startsWith("Zona:")
      ? "Entrega personalizada"
      : "Envío a domicilio";
  }
  if (order.fulfillment_type === "shipping") return "Encomienda nacional";
  return null;
}

export function getOrderShippingMethodLabel(
  order: Pick<OrderShippingDisplay, "shipping_method">,
): string | null {
  if (!order.shipping_method) return null;

  if (isNationalCarrierKey(order.shipping_method)) {
    return getShippingMethod(order.shipping_method).label;
  }

  if (order.shipping_method === "delivery" || order.shipping_method === "pickup") {
    return getShippingMethod(order.shipping_method).label;
  }

  try {
    return getShippingMethod(order.shipping_method as ShippingCarrierKey).label;
  } catch {
    return order.shipping_method;
  }
}

export function formatOrderShippingSummary(
  order: Pick<
    OrderShippingDisplay,
    "shipping_method" | "shipping_branch_name"
  >,
): string | null {
  const methodLabel = getOrderShippingMethodLabel(order);
  if (!methodLabel) return null;

  if (isNationalCarrierKey(order.shipping_method) && order.shipping_branch_name) {
    return `${methodLabel} · ${order.shipping_branch_name}`;
  }

  return methodLabel;
}

export function getOrderFulfillmentDetailLabel(
  order: Pick<OrderShippingDisplay, "fulfillment_type">,
): string {
  if (order.fulfillment_type === "pickup") return "Punto de retiro";
  return "Entrega";
}
