import { createClient } from "@/lib/supabase/server";
import {
  isValidOrderEstado,
  sortOrdersByBusinessRules,
  type OrderEstado,
} from "@/lib/orders/order-status";
import type { CatalogOrder, OrderLineItem } from "@/lib/orders/types";
import { ORDERS_PAGE_SIZE } from "@/lib/inventory/constants";

export { ORDERS_PAGE_SIZE };

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

function mapOrderRows(
  data: Array<Record<string, unknown>> | null,
): CatalogOrder[] {
  const mapped = (data ?? []).map((row) => {
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
      items: parseOrderItems(row.items),
      total_usd: Number(row.total_usd) || 0,
      payment_proof_url: row.payment_proof_url as string | null,
      estado: parseOrderEstado(row.estado),
      created_at: row.created_at as string,
      location_id: (row.location_id as string | null) ?? null,
      location_name: locationName ?? null,
      fulfillment_type:
        (row.fulfillment_type as CatalogOrder["fulfillment_type"]) ?? null,
    };
  });

  return sortOrdersByBusinessRules(mapped);
}

export interface StoreOrdersResult {
  orders: CatalogOrder[];
  totalCount: number;
  hasMore: boolean;
}

export async function getStoreOrders(
  storeId: string,
  options?: { limit?: number; offset?: number; locationId?: string | null },
): Promise<StoreOrdersResult> {
  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;
  const locationId = options?.locationId?.trim() || null;

  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select(
      "id, store_id, customer_name, customer_phone, items, total_usd, payment_proof_url, estado, created_at, location_id, fulfillment_type, store_locations(name)",
      { count: "exact" },
    )
    .eq("store_id", storeId);

  if (locationId) {
    query = query.eq("location_id", locationId);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);

  const orders = mapOrderRows(data as Array<Record<string, unknown>> | null);
  const totalCount = count ?? orders.length;

  return {
    orders,
    totalCount,
    hasMore: offset + orders.length < totalCount,
  };
}

/** Compatibilidad para llamadas que solo necesitan un array acotado. */
export async function getStoreOrdersList(
  storeId: string,
  limit = 100,
): Promise<CatalogOrder[]> {
  const { orders } = await getStoreOrders(storeId, { limit, offset: 0 });
  return orders;
}
