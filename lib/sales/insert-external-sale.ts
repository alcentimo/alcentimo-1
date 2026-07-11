import type { SupabaseClient } from "@supabase/supabase-js";
import { isValidSalesChannelDbValue } from "@/src/config/sales-channels";

export interface InsertExternalSaleInput {
  storeId: string;
  usuarioId: string;
  productoId: string;
  variantId?: string | null;
  cantidad: number;
  monto: number;
  metodoPago: string;
  canalVenta: string;
  externalReference?: string | null;
  notas?: string | null;
  deductStock?: boolean;
}

/**
 * Inserta una venta desde integraciones externas (ML webhooks, Meta, etc.).
 * Usa createAdminClient() en el caller — no importar desde componentes cliente.
 */
export async function insertExternalSale(
  admin: SupabaseClient,
  input: InsertExternalSaleInput,
): Promise<{ saleId: string } | { error: string }> {
  if (!isValidSalesChannelDbValue(input.canalVenta)) {
    return { error: `Canal de venta no válido: ${input.canalVenta}` };
  }

  if (input.cantidad <= 0 || input.monto < 0) {
    return { error: "Cantidad o monto inválidos." };
  }

  const { data: venta, error: insertError } = await admin
    .from("ventas")
    .insert({
      store_id: input.storeId,
      usuario_id: input.usuarioId,
      producto_id: input.productoId,
      variant_id: input.variantId ?? null,
      cantidad: input.cantidad,
      monto: input.monto,
      metodo_pago: input.metodoPago,
      canal_venta: input.canalVenta,
      external_reference: input.externalReference ?? null,
      notas: input.notas ?? null,
    })
    .select("id")
    .single();

  if (insertError || !venta) {
    return { error: insertError?.message ?? "No se pudo insertar la venta." };
  }

  if (input.deductStock && input.variantId) {
    const { error: stockError } = await admin.from("inventory_logs").insert({
      variant_id: input.variantId,
      movement_type: "sale_out",
      quantity_change: -input.cantidad,
      reference_type: "venta",
      reference_id: venta.id,
      notes: `Venta automática · ${input.canalVenta}`,
      created_by: input.usuarioId,
    });

    if (stockError) {
      await admin.from("ventas").delete().eq("id", venta.id);
      return { error: stockError.message };
    }
  }

  return { saleId: venta.id };
}
