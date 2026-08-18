import { createClient } from "@/lib/supabase/server";
import { PRIORITY_ORDER_ESTADOS } from "@/lib/orders/order-status";

/**
 * Cuenta pedidos que requieren atención del dropshipper
 * (por verificar pago: por_pagar | pendiente).
 */
export async function getPendingOrdersCount(storeId: string): Promise<number> {
  if (!storeId.trim()) return 0;

  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .in("estado", [...PRIORITY_ORDER_ESTADOS]);

    if (error) {
      console.error("[getPendingOrdersCount]", error.message);
      return 0;
    }

    return count ?? 0;
  } catch (error) {
    console.error("[getPendingOrdersCount]", error);
    return 0;
  }
}
