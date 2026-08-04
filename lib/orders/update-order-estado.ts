"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { updateOrderEstadoWithInventory } from "@/lib/orders/order-inventory";
import {
  isValidOrderEstado,
  type OrderEstado,
} from "@/lib/orders/order-status";
import type { OrderLineItem } from "@/lib/orders/types";
import { restoreDropshipStockForOrderLines } from "@/lib/dropship/supplier-stock";

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

function parseOrderItems(raw: unknown): OrderLineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is OrderLineItem =>
      !!item &&
      typeof item === "object" &&
      typeof (item as OrderLineItem).product_id === "string",
  );
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

  let previousEstado: string | null = null;
  let orderItems: OrderLineItem[] = [];

  if (estado === "cancelado") {
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("estado, items")
      .eq("id", trimmedId)
      .eq("store_id", auth.store.id)
      .maybeSingle();
    previousEstado = (existingOrder?.estado as string | undefined) ?? null;
    orderItems = parseOrderItems(existingOrder?.items);
  }

  const result = await updateOrderEstadoWithInventory(
    supabase,
    trimmedId,
    auth.store.id,
    estado,
  );

  if (result.error) return { error: result.error };

  if (
    estado === "cancelado" &&
    previousEstado &&
    previousEstado !== "cancelado" &&
    orderItems.some((item) => item.supplier_product_id)
  ) {
    const admin = createAdminClient();
    await restoreDropshipStockForOrderLines(admin, orderItems);
  }

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
