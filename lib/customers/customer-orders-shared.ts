import { normalizeOrderEstado, type OrderEstado } from "@/lib/orders/order-status";
import type { CatalogOrder, OrderLineItem } from "@/lib/orders/types";

export interface CustomerOrderSummary {
  id: string;
  store_id: string;
  total_usd: number;
  estado: OrderEstado;
  created_at: string;
  /** null = falta comprobante; "" = no aplica; url = adjunto. */
  payment_proof_url: string | null;
  fulfillment_type: CatalogOrder["fulfillment_type"];
  shipping_method: string | null;
  shipping_branch_name: string | null;
  delivery_address: string | null;
  tracking_number: string | null;
  item_count: number;
}

export type CustomerOrderDetail = CatalogOrder;

function parseOrderItems(value: unknown): OrderLineItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      return {
        product_id: String(row.product_id ?? ""),
        variant_id: String(row.variant_id ?? ""),
        product_name: String(row.product_name ?? "Producto"),
        variant_name: String(row.variant_name ?? "Estándar"),
        quantity: Number(row.quantity) || 0,
        unit_price_usd: Number(row.unit_price_usd) || 0,
        line_total_usd: Number(row.line_total_usd) || 0,
      };
    })
    .filter((item): item is OrderLineItem => Boolean(item?.product_id));
}

export function mapCustomerOrderRow(
  row: Record<string, unknown>,
): CustomerOrderDetail {
  const location = row.store_locations as
    | { name?: string }
    | { name?: string }[]
    | null
    | undefined;
  const locationName = Array.isArray(location)
    ? location[0]?.name
    : location?.name;

  return {
    id: row.id as string,
    store_id: row.store_id as string,
    customer_name: row.customer_name as string,
    customer_phone: (row.customer_phone as string | null) ?? null,
    customer_user_id: (row.customer_user_id as string | null) ?? null,
    items: parseOrderItems(row.items),
    total_usd: Number(row.total_usd) || 0,
    payment_proof_url: (row.payment_proof_url as string | null) ?? null,
    estado: normalizeOrderEstado(row.estado),
    created_at: row.created_at as string,
    location_id: (row.location_id as string | null) ?? null,
    location_name: locationName ?? null,
    fulfillment_type:
      (row.fulfillment_type as CatalogOrder["fulfillment_type"]) ?? null,
    shipping_method: (row.shipping_method as string | null) ?? null,
    shipping_branch_code: (row.shipping_branch_code as string | null) ?? null,
    shipping_branch_name: (row.shipping_branch_name as string | null) ?? null,
    shipping_branch_address:
      (row.shipping_branch_address as string | null) ?? null,
    delivery_address: (row.delivery_address as string | null) ?? null,
    tracking_number: (row.tracking_number as string | null) ?? null,
  };
}

export function toCustomerOrderSummary(
  order: CustomerOrderDetail,
): CustomerOrderSummary {
  return {
    id: order.id,
    store_id: order.store_id,
    total_usd: order.total_usd,
    estado: order.estado,
    created_at: order.created_at,
    payment_proof_url: order.payment_proof_url,
    fulfillment_type: order.fulfillment_type ?? null,
    shipping_method: order.shipping_method ?? null,
    shipping_branch_name: order.shipping_branch_name ?? null,
    delivery_address: order.delivery_address ?? null,
    tracking_number: order.tracking_number ?? null,
    item_count: order.items.reduce(
      (sum, item) => sum + Math.max(0, item.quantity),
      0,
    ),
  };
}

/** Mapea un row realtime/API al resumen de lista. */
export function mapCustomerOrderSummaryFromRow(
  row: Record<string, unknown>,
): CustomerOrderSummary {
  return toCustomerOrderSummary(mapCustomerOrderRow(row));
}

export function formatCustomerOrderPublicId(orderId: string): string {
  const compact = orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `#${compact || orderId.slice(0, 8)}`;
}

export function formatCustomerOrderDate(value: string): string {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
