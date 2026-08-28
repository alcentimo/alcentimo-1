import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderLineItem } from "@/lib/orders/types";
import { syncDefaultLocationStockFromVariant } from "@/lib/locations/sync-stock";
import { revalidatePublicCatalogCache } from "@/lib/catalog/public-catalog-cache";

type AdjustStockRpc = {
  ok?: boolean;
  error?: string;
  stock?: number;
  reserved?: number;
  available?: number;
  previous_stock?: number;
};

type HoldsRpc = {
  ok?: boolean;
  error?: string;
  affected_ids?: string[];
  holds?: Array<{
    product_id?: string;
    supplier_product_id?: string;
    quantity?: number;
    expires_at?: string;
  }>;
  missing?: boolean;
  committed?: number;
};

export function supplierAvailableStock(stock: number, reserved = 0): number {
  return Math.max(0, Math.floor(stock) - Math.max(0, Math.floor(reserved)));
}

export async function loadSupplierAvailableStock(
  admin: SupabaseClient,
  supplierProductId: string,
): Promise<number> {
  const { data } = await admin
    .from("supplier_products")
    .select("stock, reserved_quantity")
    .eq("id", supplierProductId)
    .maybeSingle();
  return supplierAvailableStock(
    Number(data?.stock) || 0,
    Number((data as { reserved_quantity?: number } | null)?.reserved_quantity) ||
      0,
  );
}

function isMissingHoldsRpc(message: string): boolean {
  return /dropship_stock_holds|sync_dropship_cart_holds|convert_dropship_cart_holds_to_order|commit_dropship_order_holds|release_dropship_order_holds|release_expired_dropship_stock_holds|Could not find the function|schema cache/i.test(
    message,
  );
}

async function remirrorSupplierProducts(
  admin: SupabaseClient,
  supplierProductIds: string[],
  skipVariantIds?: Set<string>,
): Promise<{ error?: string }> {
  const unique = [...new Set(supplierProductIds.filter(Boolean))];
  for (const id of unique) {
    const available = await loadSupplierAvailableStock(admin, id);
    const mirrored = await mirrorSupplierStockToLinkedStores(
      admin,
      id,
      available,
      skipVariantIds ? { skipVariantIds } : undefined,
    );
    if (mirrored.error) return mirrored;
  }
  return {};
}

export async function releaseExpiredDropshipStockHolds(
  admin: SupabaseClient,
): Promise<{ error?: string; affectedIds: string[] }> {
  const { data, error } = await admin.rpc("release_expired_dropship_stock_holds");
  if (error) {
    if (isMissingHoldsRpc(error.message)) return { affectedIds: [] };
    return { error: error.message, affectedIds: [] };
  }
  const result = data as HoldsRpc | null;
  const affectedIds = Array.isArray(result?.affected_ids)
    ? result.affected_ids.filter((id) => typeof id === "string")
    : [];
  const mirrored = await remirrorSupplierProducts(admin, affectedIds);
  if (mirrored.error) return { error: mirrored.error, affectedIds };
  return { affectedIds };
}

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
    const msg = error.message || "";
    if (/adjust_supplier_product_stock|Could not find the function|schema cache/i.test(msg)) {
      return {
        ok: false,
        error:
          "Falta aplicar la migración 098 en Supabase (adjust_supplier_product_stock).",
      };
    }
    return { ok: false, error: msg };
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
 * stock_quantity = available + reserved local, para que available
 * coincida con el stock mayorista libre (físico − holds).
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

  const linkedStoreIds = new Set<string>();

  for (const link of (links as Record<string, unknown>[] | null) ?? []) {
    const productId = String(link.product_id ?? "");
    const storeId = String(link.store_id ?? "");
    if (!productId || !storeId) continue;
    linkedStoreIds.add(storeId);

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

  if (linkedStoreIds.size > 0) {
    const { data: stores } = await admin
      .from("stores")
      .select("id, slug")
      .in("id", [...linkedStoreIds]);
    for (const store of (stores as Array<{ id?: string; slug?: string }> | null) ?? []) {
      revalidatePublicCatalogCache({
        slug: typeof store.slug === "string" ? store.slug : null,
        storeId: typeof store.id === "string" ? store.id : null,
      });
    }
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

function orderHoldLinesPayload(items: OrderLineItem[]) {
  return items
    .filter(
      (item) =>
        typeof item.supplier_product_id === "string" &&
        item.supplier_product_id.trim(),
    )
    .map((item) => ({
      product_id: item.product_id,
      supplier_product_id: String(item.supplier_product_id).trim(),
      quantity: Math.max(
        1,
        Math.floor(Number(item.stock_units ?? item.quantity) || 1),
      ),
    }));
}

async function prepareLocalReservesForDropshipLines(
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

  const consumed: Array<{ supplierProductId: string; quantity: number }> = [];

  for (const [supplierProductId, quantity] of aggregates) {
    const available = await loadSupplierAvailableStock(admin, supplierProductId);
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
        supplierStockAfterConsume: available,
      });
      if (prepared.error) {
        return { error: prepared.error, consumed: [] };
      }
      preparedVariantIds.add(variantId);
    }

    const mirrored = await remirrorSupplierProducts(
      admin,
      [supplierProductId],
      preparedVariantIds,
    );
    if (mirrored.error) return { error: mirrored.error, consumed: [] };
  }

  return { consumed };
}

/**
 * Aparta stock mayorista para las líneas dropship (hold de orden).
 * El físico se descuenta al confirmar el pago del cliente.
 */
export async function consumeDropshipStockForOrderLines(
  admin: SupabaseClient,
  storeId: string,
  items: OrderLineItem[],
  options?: {
    orderId?: string;
    customerUserId?: string | null;
    sessionKey?: string | null;
  },
): Promise<{ error?: string; consumed: Array<{ supplierProductId: string; quantity: number }> }> {
  const payload = orderHoldLinesPayload(items);
  if (payload.length === 0) {
    return { consumed: [] };
  }

  if (options?.orderId) {
    const { data, error } = await admin.rpc(
      "convert_dropship_cart_holds_to_order",
      {
        p_store_id: storeId,
        p_customer_user_id: options.customerUserId ?? null,
        p_session_key: options.sessionKey ?? null,
        p_order_id: options.orderId,
        p_lines: payload,
      },
    );
    if (error) {
      if (!isMissingHoldsRpc(error.message)) {
        return { error: error.message, consumed: [] };
      }
    } else {
      const result = data as HoldsRpc | null;
      if (result && result.ok === false) {
        return {
          error:
            result.error ??
            "No hay stock suficiente en el proveedor para completar este pedido.",
          consumed: [],
        };
      }
      return prepareLocalReservesForDropshipLines(admin, storeId, items);
    }
  }

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
        await remirrorSupplierProducts(admin, [prior.supplierProductId]);
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
        supplierStockAfterConsume: await loadSupplierAvailableStock(
          admin,
          supplierProductId,
        ),
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

    const mirrored = await remirrorSupplierProducts(
      admin,
      [supplierProductId],
      preparedVariantIds,
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
  orderId?: string | null,
): Promise<{ error?: string }> {
  if (orderId) {
    const { data, error } = await admin.rpc("release_dropship_order_holds", {
      p_order_id: orderId,
    });
    if (error) {
      if (!isMissingHoldsRpc(error.message)) return { error: error.message };
    } else {
      const result = data as HoldsRpc | null;
      if (result && result.ok === false) {
        return { error: result.error ?? "No se pudo liberar el stock reservado." };
      }
      const affectedIds = Array.isArray(result?.affected_ids)
        ? result.affected_ids.filter((id) => typeof id === "string")
        : [];
      if (!result?.missing) {
        return remirrorSupplierProducts(admin, affectedIds);
      }
    }
  }

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
    const mirrored = await remirrorSupplierProducts(admin, [supplierProductId]);
    if (mirrored.error) return { error: mirrored.error };
  }

  return {};
}

/** Confirma el descuento físico al validar el pago del cliente final. */
export async function commitDropshipStockForOrder(
  admin: SupabaseClient,
  orderId: string,
): Promise<{ error?: string }> {
  const { data, error } = await admin.rpc("commit_dropship_order_holds", {
    p_order_id: orderId,
  });
  if (error) {
    if (isMissingHoldsRpc(error.message)) return {};
    return { error: error.message };
  }
  const result = data as HoldsRpc | null;
  if (result && result.ok === false) {
    return { error: result.error ?? "No se pudo confirmar el stock mayorista." };
  }
  const affectedIds = Array.isArray(result?.affected_ids)
    ? result.affected_ids.filter((id) => typeof id === "string")
    : [];
  return remirrorSupplierProducts(admin, affectedIds);
}
