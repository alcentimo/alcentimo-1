import type { SupabaseClient } from "@supabase/supabase-js";
import { isValidOrderEstado, type OrderEstado } from "@/lib/orders/order-status";
import type { CatalogOrder, OrderLineItem } from "@/lib/orders/types";

function parseOrderEstado(value: unknown): OrderEstado {
  const raw = String(value ?? "pendiente");
  return isValidOrderEstado(raw) ? raw : "pendiente";
}

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

function mapOrderRow(row: Record<string, unknown>): CatalogOrder {
  return {
    id: row.id as string,
    store_id: row.store_id as string,
    customer_name: row.customer_name as string,
    customer_phone: (row.customer_phone as string | null) ?? null,
    items: parseOrderItems(row.items),
    total_usd: Number(row.total_usd) || 0,
    payment_proof_url: (row.payment_proof_url as string | null) ?? null,
    estado: parseOrderEstado(row.estado),
    created_at: row.created_at as string,
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
      "id, store_id, customer_name, customer_phone, items, total_usd, payment_proof_url, estado, created_at",
    )
    .eq("id", orderId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (error || !data) return null;
  return mapOrderRow(data as Record<string, unknown>);
}
