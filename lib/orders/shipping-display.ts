import type { CatalogOrder } from "@/lib/orders/types";
import type { ShippingCarrierKey } from "@/lib/store-settings/types";
import { getShippingMethod, isNationalCarrierKey } from "@/src/config/shipping-methods";

export function getOrderFulfillmentLabel(order: CatalogOrder): string | null {
  if (order.fulfillment_type === "pickup") return "Retiro en tienda";
  if (order.fulfillment_type === "delivery") return "Envío a domicilio";
  if (order.fulfillment_type === "shipping") return "Encomienda nacional";
  return null;
}

export function getOrderShippingMethodLabel(order: CatalogOrder): string | null {
  if (!order.shipping_method) return null;

  if (isNationalCarrierKey(order.shipping_method)) {
    return getShippingMethod(order.shipping_method).label;
  }

  if (order.shipping_method === "delivery") return "Delivery";
  if (order.shipping_method === "pickup") return "Retiro en tienda";

  try {
    return getShippingMethod(order.shipping_method as ShippingCarrierKey).label;
  } catch {
    return order.shipping_method;
  }
}

export function formatOrderShippingSummary(order: CatalogOrder): string | null {
  const methodLabel = getOrderShippingMethodLabel(order);
  if (!methodLabel) return null;

  if (isNationalCarrierKey(order.shipping_method) && order.shipping_branch_name) {
    return `${methodLabel} · ${order.shipping_branch_name}`;
  }

  return methodLabel;
}
