import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderLineItem } from "@/lib/orders/types";
import { syncDefaultLocationStockFromVariant } from "@/lib/locations/sync-stock";

type AdjustStockRpc = {
  ok?: boolean;
  error?: string;
  stock?: number;
  previous_stock?: number;
};

/**
 * Ajusta el stock central del mayorista de forma atómica.
 * delta < 0 descuenta; delta > 0 restaura.
 */
export async function adjustSupplierProductStock(
  admin: SupabaseClient,
  supplierProductId: string,
  delta: number,
): Promise<{ ok: true; stock: number } | { ok: false; error: string; stock?: number }> {
  const id = supplierProductId.trim();
  if (!id) {
    return { ok: false, error: "Producto mayorista inválido." };
  }
  if (!Number.isFinite(delta) || delta === 0) {
    return { ok: false, error: "Cantidad de ajuste inválida." };
  }

  const { data, error } = await admin.rpc("adjust_supplier_product_stock", {
    p_supplier_product_id: id,
    p_delta: Math.trunc(delta),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const result = data as AdjustStockRpc | null;
  if (!result?.ok) {
    return {
      ok: false,
      error: result?.error ?? "No se pudo ajustar el stock del mayorista.",
      stock: result?.stock,
    };
  }

  return { ok: true, stock: Number(result.stock) || 0 };
}

/**
 * Espeja el stock mayorista en todas las tiendas vinculadas.
 * stock_quantity = supplierStock + reserved, para que available = supplierStock.
 */
export async function mirrorSupplierStockToLinkedStores(
  admin: SupabaseClient,
  supplierProductId: string,
  supplierStock: number,
  options?: { skipVariantIds?: Set<string> },
): Promise<{ error?: string }> {
  const stock = Math.max(0, Math.floor(supplierStock));
  const skip = options?.skipVariantIds ?? new Set<string>();

  const { data: links, error: linksError } = await admin
    .from("store_dropship_links")
    .select("product_id, store_id")
    .eq("supplier_product_id", supplierProductId);

  if (linksError) return { error: linksError.message };

  for (const link of (links as Record<string, unknown>[] | null) ?? []) {
    const productId = String(link.product_id ?? "");
    const storeId = String(link.store_id ?? "");
    if (!productId || !storeId) continue;

    const { data: variant, error: variantError } = await admin
      .from("product_variants")
      .select("id, reserved_quantity")
      .eq("product_id", productId)
      .eq("is_default", true)
      .maybeSingle();

    if (variantError) return { error: variantError.message };
    if (!variant) continue;

    const variantId = String(variant.id);
    if (skip.has(variantId)) continue;

    const reserved = Math.max(0, Math.floor(Number(variant.reserved_quantity) || 0));
    const nextStock = stock + reserved;

    const { error: updateError } = await admin
      .from("product_variants")
      .update({
        stock_quantity: nextStock,
        updated_at: new Date().toISOString(),
      })
      .eq("id", variantId);

    if (updateError) return { error: updateError.message };

    const locationSync = await syncDefaultLocationStockFromVariant(
      admin,
      storeId,
      variantId,
      nextStock,
    );
    if (locationSync.error) return { error: locationSync.error };
  }

  return {};
}

/** Prepara la variante de la tienda compradora para poder reservar qty tras descontar el mayorista. */
export async function prepareDropshipVariantForReserve(
  admin: SupabaseClient,
  options: {
    variantId: string;
    storeId: string;
    quantity: number;
    supplierStockAfterConsume: number;
  },
): Promise<{ error?: string }> {
  const qty = Math.max(1, Math.floor(options.quantity));
  const supplierStock = Math.max(0, Math.floor(options.supplierStockAfterConsume));

  const { data: variant, error } = await admin
    .from("product_variants")
    .select("id, reserved_quantity")
    .eq("id", options.variantId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!variant) return { error: "Variante de inventario no encontrada." };

  const reserved = Math.max(0, Math.floor(Number(variant.reserved_quantity) || 0));
  // Tras reservar qty, available debe quedar = supplierStock.
  const nextStock = reserved + qty + supplierStock;

  const { error: updateError } = await admin
    .from("product_variants")
    .update({
      stock_quantity: nextStock,
      updated_at: new Date().toISOString(),
    })
    .eq("id", options.variantId);

  if (updateError) return { error: updateError.message };

  return syncDefaultLocationStockFromVariant(
    admin,
    options.storeId,
    options.variantId,
    nextStock,
  );
}

/**
 * Descuenta stock del mayorista para las líneas dropship de un pedido,
 * prepara la reserva local y espeja el stock en el resto de tiendas.
 */
export async function consumeDropshipStockForOrderLines(
  admin: SupabaseClient,
  storeId: string,
  items: OrderLineItem[],
): Promise<{ error?: string; consumed: Array<{ supplierProductId: string; quantity: number }> }> {
  const aggregates = new Map<string, number>();
  const linesBySupplier = new Map<string, OrderLineItem[]>();

  for (const item of items) {
    const supplierId =
      typeof item.supplier_product_id === "string"
        ? item.supplier_product_id.trim()
        : "";
    if (!supplierId) continue;
    const qty = Math.max(1, Math.floor(Number(item.stock_units ?? item.quantity) || 1));
    aggregates.set(supplierId, (aggregates.get(supplierId) ?? 0) + qty);
    const list = linesBySupplier.get(supplierId) ?? [];
    list.push(item);
    linesBySupplier.set(supplierId, list);
  }

  if (aggregates.size === 0) {
    return { consumed: [] };
  }

  const consumed: Array<{ supplierProductId: string; quantity: number }> = [];

  for (const [supplierProductId, quantity] of aggregates) {
    const adjusted = await adjustSupplierProductStock(
      admin,
      supplierProductId,
      -quantity,
    );
    if (!adjusted.ok) {
      // Rollback parcial de consumos previos.
      for (const prior of consumed) {
        await adjustSupplierProductStock(
          admin,
          prior.supplierProductId,
          prior.quantity,
        );
        await mirrorSupplierStockToLinkedStores(
          admin,
          prior.supplierProductId,
          (
            await admin
              .from("supplier_products")
              .select("stock")
              .eq("id", prior.supplierProductId)
              .maybeSingle()
          ).data?.stock ?? 0,
        );
      }
      return {
        error:
          adjusted.error === "Stock insuficiente en el mayorista."
            ? "No hay stock suficiente en el proveedor para completar este pedido."
            : adjusted.error,
        consumed: [],
      };
    }

    consumed.push({ supplierProductId, quantity });

    const preparedVariantIds = new Set<string>();
    for (const line of linesBySupplier.get(supplierProductId) ?? []) {
      const variantId = String(line.inventory_variant_id ?? line.variant_id);
      const lineQty = Math.max(
        1,
        Math.floor(Number(line.stock_units ?? line.quantity) || 1),
      );
      const prepared = await prepareDropshipVariantForReserve(admin, {
        variantId,
        storeId,
        quantity: lineQty,
        supplierStockAfterConsume: adjusted.stock,
      });
      if (prepared.error) {
        for (const prior of consumed) {
          await adjustSupplierProductStock(
            admin,
            prior.supplierProductId,
            prior.quantity,
          );
        }
        return { error: prepared.error, consumed: [] };
      }
      preparedVariantIds.add(variantId);
    }

    const mirrored = await mirrorSupplierStockToLinkedStores(
      admin,
      supplierProductId,
      adjusted.stock,
      { skipVariantIds: preparedVariantIds },
    );
    if (mirrored.error) {
      for (const prior of consumed) {
        await adjustSupplierProductStock(
          admin,
          prior.supplierProductId,
          prior.quantity,
        );
      }
      return { error: mirrored.error, consumed: [] };
    }
  }

  return { consumed };
}

/** Restaura stock mayorista si el pedido se cancela / libera inventario. */
export async function restoreDropshipStockForOrderLines(
  admin: SupabaseClient,
  items: OrderLineItem[],
): Promise<{ error?: string }> {
  const aggregates = new Map<string, number>();

  for (const item of items) {
    const supplierId =
      typeof item.supplier_product_id === "string"
        ? item.supplier_product_id.trim()
        : "";
    if (!supplierId) continue;
    const qty = Math.max(1, Math.floor(Number(item.stock_units ?? item.quantity) || 1));
    aggregates.set(supplierId, (aggregates.get(supplierId) ?? 0) + qty);
  }

  for (const [supplierProductId, quantity] of aggregates) {
    const adjusted = await adjustSupplierProductStock(
      admin,
      supplierProductId,
      quantity,
    );
    if (!adjusted.ok) return { error: adjusted.error };

    const mirrored = await mirrorSupplierStockToLinkedStores(
      admin,
      supplierProductId,
      adjusted.stock,
    );
    if (mirrored.error) return { error: mirrored.error };
  }

  return {};
}
