"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { updateOrderEstadoWithInventory } from "@/lib/orders/order-inventory";
import {
  isValidOrderEstado,
  type OrderEstado,
} from "@/lib/orders/order-status";

export interface UpdateOrderEstadoResult {
  error?: string;
  success?: boolean;
}

export async function updateOrderEstado(
  orderId: string,
  estado: OrderEstado,
): Promise<UpdateOrderEstadoResult> {
  const trimmedId = orderId.trim();
  if (!trimmedId) {
    return { error: "Pedido no válido." };
  }

  if (!isValidOrderEstado(estado)) {
    return { error: "Estado no válido." };
  }

  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const result = await updateOrderEstadoWithInventory(
    supabase,
    trimmedId,
    auth.store.id,
    estado,
  );

  if (result.error) return { error: result.error };

  revalidatePath("/dashboard/pedidos");
  revalidatePath("/dashboard/analiticas");
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/inventario");
  revalidatePath("/dashboard");
  revalidatePath(`/c/${auth.store.slug}`);
  revalidatePath(`/pedidos/${trimmedId}`);

  return { success: true };
}
