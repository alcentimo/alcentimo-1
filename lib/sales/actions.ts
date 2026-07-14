"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import {
  isValidSalesChannelDbValue,
} from "@/src/config/sales-channels";
import {
  isValidSalesPaymentDbValue,
} from "@/src/config/sales-payment-methods";
import type { CreateSaleFormState } from "@/lib/sales/types";
import { formatUsd } from "@/lib/format";

function parsePositiveInt(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseMoney(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const parsed = Number.parseFloat(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}

export async function createSale(
  _prevState: CreateSaleFormState,
  formData: FormData,
): Promise<CreateSaleFormState> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return { error: auth.error };
  }

  const { store, authUser } = auth;

  const productoId = formData.get("producto_id");
  const variantId = formData.get("variant_id");
  const cantidad = parsePositiveInt(formData.get("cantidad"));
  const monto = parseMoney(formData.get("monto"));
  const metodoPago = formData.get("metodo_pago");
  const canalVenta = formData.get("canal_venta");
  const notas = formData.get("notas");

  if (typeof productoId !== "string" || !productoId) {
    return { error: "Selecciona un producto del inventario." };
  }

  if (cantidad == null) {
    return { error: "La cantidad debe ser un número mayor a cero." };
  }

  if (monto == null) {
    return { error: "El monto total no es válido." };
  }

  if (typeof metodoPago !== "string" || !isValidSalesPaymentDbValue(metodoPago)) {
    return { error: "Selecciona un método de pago válido." };
  }

  if (typeof canalVenta !== "string" || !isValidSalesChannelDbValue(canalVenta)) {
    return { error: "Selecciona un canal de venta válido." };
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, store_id, name")
    .eq("id", productoId)
    .eq("store_id", store.id)
    .eq("is_active", true)
    .maybeSingle();

  if (productError || !product) {
    return { error: "El producto no pertenece a tu inventario." };
  }

  let resolvedVariantId =
    typeof variantId === "string" && variantId ? variantId : null;

  if (resolvedVariantId) {
    const { data: variant } = await supabase
      .from("product_variants")
      .select("id")
      .eq("id", resolvedVariantId)
      .eq("product_id", product.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!variant) {
      resolvedVariantId = null;
    }
  }

  if (!resolvedVariantId) {
    const { data: defaultVariant } = await supabase
      .from("product_variants")
      .select("id, stock_quantity, reserved_quantity")
      .eq("product_id", product.id)
      .eq("is_default", true)
      .eq("is_active", true)
      .maybeSingle();

    if (!defaultVariant) {
      return { error: "El producto no tiene variante activa para descontar stock." };
    }

    resolvedVariantId = defaultVariant.id;

    const available =
      (defaultVariant.stock_quantity ?? 0) -
      (defaultVariant.reserved_quantity ?? 0);

    if (available < cantidad) {
      return {
        error: `Stock insuficiente. Disponible: ${available} unidad${available !== 1 ? "es" : ""}.`,
      };
    }
  }

  const { data: venta, error: insertError } = await supabase
    .from("ventas")
    .insert({
      store_id: store.id,
      usuario_id: authUser.id,
      producto_id: product.id,
      variant_id: resolvedVariantId,
      cantidad,
      monto,
      metodo_pago: metodoPago,
      canal_venta: canalVenta,
      notas:
        typeof notas === "string" && notas.trim() ? notas.trim() : null,
    })
    .select("id")
    .single();

  if (insertError || !venta) {
    return { error: insertError?.message ?? "No se pudo registrar la venta." };
  }

  const { error: stockError } = await supabase.from("inventory_logs").insert({
    variant_id: resolvedVariantId,
    movement_type: "sale_out",
    quantity_change: -cantidad,
    reference_type: "venta",
    reference_id: venta.id,
    notes: `Venta manual · ${canalVenta} · ${metodoPago}`,
    created_by: authUser.id,
  });

  if (stockError) {
    await supabase.from("ventas").delete().eq("id", venta.id);
    return {
      error:
        stockError.message ??
        "La venta no se completó porque falló el descuento de inventario.",
    };
  }

  revalidatePath("/dashboard/ventas");
  revalidatePath("/dashboard/inventario");
  revalidatePath(`/tienda/${store.slug}`);

  return {
    success: `Venta registrada: ${product.name} × ${cantidad} por ${formatUsd(monto)}.`,
  };
}
