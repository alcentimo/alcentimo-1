import { createClient } from "@/lib/supabase/server";
import {
  isValidOrderEstado,
  sortOrdersByBusinessRules,
  type OrderEstado,
} from "@/lib/orders/order-status";
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

export async function getStoreOrders(
  storeId: string,
  limit = 100,
): Promise<CatalogOrder[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, store_id, customer_name, customer_phone, items, total_usd, payment_proof_url, estado, created_at",
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const mapped = (data ?? []).map((row) => ({
    id: row.id,
    store_id: row.store_id,
    customer_name: row.customer_name,
    customer_phone: (row.customer_phone as string | null) ?? null,
    items: parseOrderItems(row.items),
    total_usd: Number(row.total_usd) || 0,
    payment_proof_url: row.payment_proof_url,
    estado: parseOrderEstado(row.estado),
    created_at: row.created_at,
  }));

  // PostgREST no expone CASE en .order(); aplicamos el ORDER BY lógico en capa de datos.
  return sortOrdersByBusinessRules(mapped);
}
