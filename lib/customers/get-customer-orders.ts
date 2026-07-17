import { createClient } from "@/lib/supabase/server";
import { isValidOrderEstado, type OrderEstado } from "@/lib/orders/order-status";

export interface CustomerOrderSummary {
  id: string;
  total_usd: number;
  estado: OrderEstado;
  created_at: string;
}

function parseOrderEstado(value: unknown): OrderEstado {
  const raw = String(value ?? "pendiente");
  return isValidOrderEstado(raw) ? raw : "pendiente";
}

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
    .select("id, total_usd, estado, created_at")
    .eq("store_id", storeId)
    .eq("customer_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    total_usd: Number(row.total_usd) || 0,
    estado: parseOrderEstado(row.estado),
    created_at: row.created_at,
  }));
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
