"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { updateOrderEstadoWithInventory } from "@/lib/orders/order-inventory";
import {
  isValidOrderEstado,
  type OrderEstado,
} from "@/lib/orders/order-status";

export interface UpdateOrderEstadoOptions {
  /** Número de guía de encomienda (opcional al marcar Enviado). */
  trackingNumber?: string | null;
}

export interface UpdateOrderEstadoResult {
  error?: string;
  success?: boolean;
  trackingNumber?: string | null;
}

function revalidateOrderPaths(storeSlug: string, orderId: string) {
  revalidatePath("/dashboard/pedidos");
  revalidatePath("/dashboard/analiticas");
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/inventario");
  revalidatePath("/dashboard");
  revalidatePath(`/c/${storeSlug}`);
  revalidatePath(`/pedidos/${orderId}`);
}

export async function updateOrderEstado(
  orderId: string,
  estado: OrderEstado,
  options?: UpdateOrderEstadoOptions,
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

  let trackingNumber: string | null | undefined = undefined;

  if (estado === "enviado" && options && "trackingNumber" in options) {
    const nextTracking =
      typeof options.trackingNumber === "string"
        ? options.trackingNumber.trim() || null
        : null;

    const { error: trackingError } = await supabase
      .from("orders")
      .update({ tracking_number: nextTracking })
      .eq("id", trimmedId)
      .eq("store_id", auth.store.id);

    if (trackingError) {
      return { error: trackingError.message };
    }

    trackingNumber = nextTracking;
  }

  revalidateOrderPaths(auth.store.slug, trimmedId);

  return { success: true, trackingNumber };
}
