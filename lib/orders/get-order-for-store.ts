import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeOrderEstado, type OrderEstado } from "@/lib/orders/order-status";
import type { CatalogOrder, OrderLineItem } from "@/lib/orders/types";

function parseOrderEstado(value: unknown): OrderEstado {
  return normalizeOrderEstado(value);
}

function parseOrderItems(value: unknown): OrderLineItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): OrderLineItem | null => {
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
        supplier_product_id:
          typeof row.supplier_product_id === "string" &&
          row.supplier_product_id.trim()
            ? row.supplier_product_id.trim()
            : null,
        unit_cost_usd:
          row.unit_cost_usd != null && Number.isFinite(Number(row.unit_cost_usd))
            ? Number(row.unit_cost_usd)
            : undefined,
        cost_locked_at:
          typeof row.cost_locked_at === "string" ? row.cost_locked_at : undefined,
      };
    })
    .filter((item): item is OrderLineItem => Boolean(item?.product_id));
}

function mapOrderRow(row: Record<string, unknown>): CatalogOrder {
  return {
    id: row.id as string,
    store_id: row.store_id as string,
    customer_name: row.customer_name as string,
    customer_phone: (row.customer_phone as string | null) ?? null,
    customer_user_id: (row.customer_user_id as string | null) ?? null,
    items: parseOrderItems(row.items),
    total_usd: Number(row.total_usd) || 0,
    payment_proof_url: (row.payment_proof_url as string | null) ?? null,
    estado: parseOrderEstado(row.estado),
    created_at: row.created_at as string,
    tracking_number: (row.tracking_number as string | null) ?? null,
  };
}

export async function getOrderForStore(
  supabase: SupabaseClient,
  orderId: string,
  storeId: string,
): Promise<CatalogOrder | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, store_id, customer_name, customer_phone, customer_user_id, items, total_usd, payment_proof_url, estado, created_at, tracking_number",
    )
    .eq("id", orderId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (error || !data) return null;
  return mapOrderRow(data as Record<string, unknown>);
}
