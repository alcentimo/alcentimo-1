import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isCompletedOrderEstado,
  normalizeOrderEstado,
} from "@/lib/orders/order-status";
import type { SupplierOrderStatus } from "@/lib/supplier/order-types";

/**
 * Cuando el proveedor marca listo para recolección (o Alcéntimo confirma el retiro),
 * el pedido del catálogo avanza a «En preparación».
 * No marca Enviado: eso lo hace Alcéntimo al despachar al cliente final.
 */
export async function syncCatalogOrderFromSupplierHold(input: {
  sourceCatalogOrderId: string | null;
  supplierStatus: SupplierOrderStatus;
}): Promise<{ error?: string }> {
  const catalogOrderId = input.sourceCatalogOrderId?.trim() ?? "";
  if (!catalogOrderId) return {};
  if (
    input.supplierStatus !== "preparando" &&
    input.supplierStatus !== "despachado"
  ) {
    return {};
  }

  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("orders")
    .select("id, estado, store_id")
    .eq("id", catalogOrderId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!order) return {};

  const current = normalizeOrderEstado(order.estado);
  if (current === "cancelado" || isCompletedOrderEstado(current)) return {};
  if (current === "preparacion_logistica") return {};
  if (current !== "procesando") return {};

  const { error: updateError } = await admin
    .from("orders")
    .update({ estado: "preparacion_logistica" })
    .eq("id", catalogOrderId)
    .eq("estado", "procesando");

  if (updateError) return { error: updateError.message };

  revalidatePath("/dashboard/pedidos");
  revalidatePath("/proveedor/dashboard");

  const storeId = typeof order.store_id === "string" ? order.store_id : "";
  if (storeId) {
    const { data: store } = await admin
      .from("stores")
      .select("slug")
      .eq("id", storeId)
      .maybeSingle();
    const slug = typeof store?.slug === "string" ? store.slug.trim() : "";
    if (slug) {
      revalidatePath(`/c/${slug}`);
      revalidatePath(`/pedidos/${catalogOrderId}`);
    }
  }

  return {};
}
