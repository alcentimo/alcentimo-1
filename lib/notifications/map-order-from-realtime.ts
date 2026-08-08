import { normalizeOrderEstado } from "@/lib/orders/order-status";
import type { CatalogOrder, OrderLineItem } from "@/lib/orders/types";

function parseItems(value: unknown): OrderLineItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const productId = String(row.product_id ?? "");
      if (!productId) return null;
      return {
        product_id: productId,
        variant_id: String(row.variant_id ?? ""),
        product_name: String(row.product_name ?? "Producto"),
        variant_name: String(row.variant_name ?? "Estándar"),
        quantity: Number(row.quantity) || 0,
        unit_price_usd: Number(row.unit_price_usd) || 0,
        line_total_usd: Number(row.line_total_usd) || 0,
      };
    })
    .filter((item): item is OrderLineItem => Boolean(item));
}

/** Mapea un row de Realtime (postgres_changes) a CatalogOrder. */
export function mapCatalogOrderFromRealtimeRow(
  row: Record<string, unknown>,
): CatalogOrder | null {
  if (typeof row.id !== "string" || typeof row.store_id !== "string") {
    return null;
  }

  return {
    id: row.id,
    store_id: row.store_id,
    customer_name:
      typeof row.customer_name === "string" && row.customer_name.trim()
        ? row.customer_name
        : "Cliente",
    customer_phone:
      typeof row.customer_phone === "string" ? row.customer_phone : null,
    customer_user_id:
      typeof row.customer_user_id === "string" ? row.customer_user_id : null,
    items: parseItems(row.items),
    total_usd: Number(row.total_usd) || 0,
    payment_proof_url:
      typeof row.payment_proof_url === "string" ? row.payment_proof_url : null,
    estado: normalizeOrderEstado(row.estado),
    created_at:
      typeof row.created_at === "string"
        ? row.created_at
        : new Date().toISOString(),
    location_id:
      typeof row.location_id === "string" ? row.location_id : null,
    fulfillment_type:
      (row.fulfillment_type as CatalogOrder["fulfillment_type"]) ?? null,
    shipping_method:
      typeof row.shipping_method === "string" ? row.shipping_method : null,
    shipping_branch_code:
      typeof row.shipping_branch_code === "string"
        ? row.shipping_branch_code
        : null,
    shipping_branch_name:
      typeof row.shipping_branch_name === "string"
        ? row.shipping_branch_name
        : null,
    shipping_branch_address:
      typeof row.shipping_branch_address === "string"
        ? row.shipping_branch_address
        : null,
    delivery_address:
      typeof row.delivery_address === "string" ? row.delivery_address : null,
    tracking_number:
      typeof row.tracking_number === "string" ? row.tracking_number : null,
  };
}
