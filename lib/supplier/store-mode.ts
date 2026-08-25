import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { parsePublicCatalogEnabled } from "@/lib/catalog/supplier-public-catalog-flag";

export function parseSupplierStoreModeEnabled(value: unknown): boolean {
  return parsePublicCatalogEnabled(value);
}

export function isMissingStoreModeSchema(message: string): boolean {
  const text = message.toLowerCase();
  return (
    (text.includes("store_mode_enabled") ||
      text.includes("admin_set_supplier_store_mode") ||
      text.includes("ensure_supplier_store_mode_column")) &&
    (text.includes("does not exist") ||
      text.includes("schema cache") ||
      text.includes("could not find") ||
      (text.includes("function") && text.includes("not found")))
  );
}

/** Persistencia exclusiva del panel admin. El proveedor no puede cambiar este flag. */
export async function persistSupplierStoreModeEnabled(input: {
  supplierUserId: string;
  enabled: boolean;
}): Promise<{ error?: string; storeModeEnabled: boolean }> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = admin as any;

  try {
    await client.rpc("ensure_supplier_store_mode_column");
  } catch {
    // La migración puede no haberse aplicado aún.
  }

  const rpc = await client.rpc("admin_set_supplier_store_mode", {
    p_user_id: input.supplierUserId,
    p_enabled: input.enabled,
  });

  if (!rpc.error) {
    const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
    if (row) {
      const saved = parseSupplierStoreModeEnabled(row.store_mode_enabled);
      if (saved === input.enabled) {
        return { storeModeEnabled: saved };
      }
    }
  } else if (
    !isMissingStoreModeSchema(rpc.error.message) &&
    !rpc.error.message.toLowerCase().includes("could not find the function")
  ) {
    return { error: rpc.error.message, storeModeEnabled: false };
  }

  const { data: updated, error: updateError } = await client
    .from("supplier_profiles")
    .update({
      store_mode_enabled: input.enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", input.supplierUserId)
    .select("user_id, store_mode_enabled")
    .maybeSingle();

  if (updateError) {
    return { error: updateError.message, storeModeEnabled: false };
  }
  if (!updated) {
    return {
      error: "No se pudo guardar el modo tienda de este proveedor.",
      storeModeEnabled: false,
    };
  }

  const saved = parseSupplierStoreModeEnabled(
    (updated as { store_mode_enabled?: unknown }).store_mode_enabled,
  );
  if (saved !== input.enabled) {
    return {
      error: "La base de datos no persistió el interruptor de modo tienda.",
      storeModeEnabled: saved,
    };
  }

  return { storeModeEnabled: saved };
}

export async function applySupplierStoreModeSideEffects(input: {
  supplierUserId: string;
  enabled: boolean;
}): Promise<void> {
  if (!input.enabled) return;
  try {
    const { ensureSupplierOwnStore } = await import("@/lib/supplier/own-store");
    await ensureSupplierOwnStore(input.supplierUserId);
  } catch (caught) {
    console.warn(
      "[applySupplierStoreModeSideEffects]",
      caught instanceof Error ? caught.message : caught,
    );
  }
}
