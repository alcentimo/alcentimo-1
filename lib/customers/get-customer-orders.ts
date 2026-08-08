import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  mapCustomerOrderRow,
  toCustomerOrderSummary,
  type CustomerOrderDetail,
  type CustomerOrderSummary,
} from "@/lib/customers/customer-orders-shared";

export type {
  CustomerOrderDetail,
  CustomerOrderSummary,
} from "@/lib/customers/customer-orders-shared";

export {
  formatCustomerOrderDate,
  formatCustomerOrderPublicId,
  mapCustomerOrderSummaryFromRow,
} from "@/lib/customers/customer-orders-shared";

const CUSTOMER_ORDER_SELECT =
  "id, store_id, customer_name, customer_phone, customer_user_id, items, total_usd, payment_proof_url, estado, created_at, location_id, fulfillment_type, shipping_method, shipping_branch_code, shipping_branch_name, shipping_branch_address, delivery_address, tracking_number, store_locations(name)";

/** Pedidos del cliente logueado en una tienda (RLS: orders_customer_select). */
export async function getCustomerOrdersForStore(
  storeId: string,
  limit = 50,
): Promise<CustomerOrderSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("orders")
    .select(CUSTOMER_ORDER_SELECT)
    .eq("store_id", storeId)
    .eq("customer_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) =>
    toCustomerOrderSummary(mapCustomerOrderRow(row as Record<string, unknown>)),
  );
}

/** Detalle de un pedido del cliente en la tienda (RLS). */
export async function getCustomerOrderForStore(
  storeId: string,
  orderId: string,
): Promise<CustomerOrderDetail | null> {
  const normalizedOrderId = orderId.trim();
  if (!normalizedOrderId) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("orders")
    .select(CUSTOMER_ORDER_SELECT)
    .eq("store_id", storeId)
    .eq("customer_user_id", user.id)
    .eq("id", normalizedOrderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return mapCustomerOrderRow(data as Record<string, unknown>);
}
