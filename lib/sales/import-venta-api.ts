import type { SupabaseClient } from "@supabase/supabase-js";
import { isValidSalesChannelDbValue } from "@/src/config/sales-channels";
import { isValidSalesPaymentDbValue } from "@/src/config/sales-payment-methods";
import { insertExternalSale } from "@/lib/sales/insert-external-sale";

export interface ImportVentaPayload {
  producto_id: string;
  cantidad: number;
  monto: number;
  metodo_pago: string;
  canal_venta: string;
  external_reference: string;
}

export type ImportVentaResult =
  | { ok: true; saleId: string; storeId: string }
  | { ok: false; error: string };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parsePositiveInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
}

function parseMoney(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.round(value * 100) / 100;
}

export function parseImportVentaPayload(body: unknown): ImportVentaPayload | null {
  if (!body || typeof body !== "object") return null;

  const record = body as Record<string, unknown>;
  const cantidad = parsePositiveInt(record.cantidad);
  const monto = parseMoney(record.monto);

  if (
    !isNonEmptyString(record.producto_id) ||
    cantidad == null ||
    monto == null ||
    !isNonEmptyString(record.metodo_pago) ||
    !isNonEmptyString(record.canal_venta) ||
    !isNonEmptyString(record.external_reference)
  ) {
    return null;
  }

  return {
    producto_id: record.producto_id.trim(),
    cantidad,
    monto,
    metodo_pago: record.metodo_pago.trim(),
    canal_venta: record.canal_venta.trim(),
    external_reference: record.external_reference.trim(),
  };
}

/**
 * Registra una venta importada desde un POS o proceso externo.
 * Valida que el producto pertenezca a la tienda y usa el owner como usuario_id.
 */
export async function importVentaFromApi(
  admin: SupabaseClient,
  payload: ImportVentaPayload,
  options?: { storeId?: string },
): Promise<ImportVentaResult> {
  if (!isValidSalesChannelDbValue(payload.canal_venta)) {
    return { ok: false, error: "canal_venta no es válido." };
  }

  if (!isValidSalesPaymentDbValue(payload.metodo_pago)) {
    return { ok: false, error: "metodo_pago no es válido." };
  }

  const { data: product, error: productError } = await admin
    .from("products")
    .select("id, store_id, name")
    .eq("id", payload.producto_id)
    .eq("is_active", true)
    .maybeSingle();

  if (productError || !product) {
    return { ok: false, error: "producto_id no existe o no está activo." };
  }

  if (options?.storeId && product.store_id !== options.storeId) {
    return {
      ok: false,
      error: "El producto no pertenece a la tienda indicada (store_id).",
    };
  }

  const { data: store, error: storeError } = await admin
    .from("stores")
    .select("id, owner_id, is_active")
    .eq("id", product.store_id)
    .maybeSingle();

  if (storeError || !store?.is_active || !store.owner_id) {
    return { ok: false, error: "La tienda del producto no está disponible." };
  }

  const { data: defaultVariant, error: variantError } = await admin
    .from("product_variants")
    .select("id")
    .eq("product_id", product.id)
    .eq("is_default", true)
    .eq("is_active", true)
    .maybeSingle();

  if (variantError || !defaultVariant) {
    return {
      ok: false,
      error: "El producto no tiene variante activa para registrar la venta.",
    };
  }

  const { data: existingSale } = await admin
    .from("ventas")
    .select("id")
    .eq("store_id", store.id)
    .eq("external_reference", payload.external_reference)
    .maybeSingle();

  if (existingSale) {
    return {
      ok: true,
      saleId: existingSale.id,
      storeId: store.id,
    };
  }

  const result = await insertExternalSale(admin, {
    storeId: store.id,
    usuarioId: store.owner_id,
    productoId: product.id,
    variantId: defaultVariant.id,
    cantidad: payload.cantidad,
    monto: payload.monto,
    metodoPago: payload.metodo_pago,
    canalVenta: payload.canal_venta,
    externalReference: payload.external_reference,
    notas: "Importación POS / API externa",
    deductStock: true,
  });

  if ("error" in result) {
    return { ok: false, error: result.error };
  }

  return { ok: true, saleId: result.saleId, storeId: store.id };
}
