import type { SupabaseClient } from "@supabase/supabase-js";

type InventoryRpcResult = { error?: string; success?: boolean } | null;

function parseInventoryRpcResult(
  data: unknown,
  fallbackError: string,
): { error?: string; success?: boolean } {
  const result = data as InventoryRpcResult;

  if (result?.error) {
    return { error: result.error };
  }

  if (!result?.success) {
    return { error: fallbackError };
  }

  return { success: true };
}

export async function reserveOrderInventory(
  supabase: SupabaseClient,
  orderId: string,
): Promise<{ error?: string; success?: boolean }> {
  const { data, error } = await supabase.rpc("reserve_order_inventory", {
    p_order_id: orderId,
  });

  if (error) {
    return { error: error.message };
  }

  return parseInventoryRpcResult(
    data,
    "No se pudo reservar el inventario del pedido.",
  );
}

export async function updateOrderEstadoWithInventory(
  supabase: SupabaseClient,
  orderId: string,
  storeId: string,
  estado: string,
): Promise<{ error?: string; success?: boolean }> {
  const { data, error } = await supabase.rpc(
    "update_order_estado_with_inventory",
    {
      p_order_id: orderId,
      p_store_id: storeId,
      p_new_estado: estado,
    },
  );

  if (error) {
    return { error: error.message };
  }

  return parseInventoryRpcResult(
    data,
    "No se pudo actualizar el estado del pedido.",
  );
}
