import type { CatalogOrder } from "@/lib/orders/types";
import {
  formatOrderShippingSummary,
  getOrderFulfillmentDetailLabel,
  getOrderFulfillmentLabel,
  getOrderShippingMethodLabel,
} from "@/lib/orders/shipping-display";
import { isNationalCarrierKey } from "@/src/config/shipping-methods";

interface OrderShippingDetailsProps {
  order: CatalogOrder;
  className?: string;
}

export function OrderShippingDetails({
  order,
  className = "mt-2 space-y-1 text-xs text-zinc-500 dark:text-zinc-400",
}: OrderShippingDetailsProps) {
  const fulfillmentLabel = getOrderFulfillmentLabel(order);
  const shippingSummary = formatOrderShippingSummary(order);
  const hasDetails =
    fulfillmentLabel ||
    shippingSummary ||
    order.location_name ||
    order.delivery_address ||
    order.shipping_branch_address;

  if (!hasDetails) return null;

  return (
    <div className={className}>
      {fulfillmentLabel ? <p>{fulfillmentLabel}</p> : null}
      {getOrderShippingMethodLabel(order) ? (
        <p>
          {isNationalCarrierKey(order.shipping_method) ? "Agencia" : "Método"}:{" "}
          <strong className="font-medium">{getOrderShippingMethodLabel(order)}</strong>
        </p>
      ) : null}
      {isNationalCarrierKey(order.shipping_method) && order.shipping_branch_name ? (
        <p>
          Sucursal destino:{" "}
          <strong className="font-medium">{order.shipping_branch_name}</strong>
        </p>
      ) : null}
      {order.shipping_branch_address ? (
        <p className="text-zinc-400 dark:text-zinc-500">{order.shipping_branch_address}</p>
      ) : null}
      {order.delivery_address ? (
        <p>
          {getOrderFulfillmentDetailLabel(order)}:{" "}
          <strong className="font-medium">{order.delivery_address}</strong>
        </p>
      ) : null}
      {order.location_name ? (
        <p>
          Sucursal tienda:{" "}
          <strong className="font-medium">{order.location_name}</strong>
        </p>
      ) : null}
      {isNationalCarrierKey(order.shipping_method) && shippingSummary ? (
        <p>{shippingSummary}</p>
      ) : null}
    </div>
  );
}
