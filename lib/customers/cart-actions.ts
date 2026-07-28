"use server";

import type { CartItem, CartModifierSelection } from "@/lib/catalog/cart-types";
import { cartItemKey } from "@/lib/catalog/cart-types";
import type { CartLineInput } from "@/lib/catalog/cart-lines";
import { mergeCartLines } from "@/lib/catalog/cart-lines";
import { hydrateCartLines } from "@/lib/catalog/hydrate-cart-items";
import { resolveActiveStoreBySlug } from "@/lib/customers/middleware-access";
import { createClient } from "@/lib/supabase/server";

export type CustomerCartActionResult =
  | { ok: true; items: CartItem[] }
  | { ok: false; error: string };

interface CartAccessContext {
  userId: string;
  storeId: string;
}

function sanitizeModifiers(
  value: unknown,
): CartModifierSelection[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const rows: CartModifierSelection[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Partial<CartModifierSelection>;
    const groupId = String(row.groupId ?? "").trim();
    const optionId = String(row.optionId ?? "").trim();
    if (!groupId || !optionId) continue;
    rows.push({
      groupId,
      groupName: String(row.groupName ?? "").trim() || "Extra",
      optionId,
      optionName: String(row.optionName ?? "").trim() || "Opción",
      priceExtraUsd: Math.max(0, Number(row.priceExtraUsd) || 0),
    });
  }
  return rows.length > 0 ? rows : undefined;
}

async function resolveCartAccess(
  storeSlug: string,
): Promise<CartAccessContext | { error: string }> {
  const normalizedSlug = storeSlug.trim().toLowerCase();
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Debes iniciar sesión para sincronizar el carrito." };
  }

  const store = await resolveActiveStoreBySlug(supabase, normalizedSlug);
  if (!store) {
    return { error: "Tienda no encontrada." };
  }

  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("store_id", store.id)
    .maybeSingle();

  if (!profile) {
    return { error: "No tienes cuenta de cliente en esta tienda." };
  }

  return { userId: user.id, storeId: store.id };
}

async function fetchStoredCartLines(
  userId: string,
  storeId: string,
): Promise<CartLineInput[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_cart_items")
    .select("product_id, variant_id, quantity, modifiers_json, line_key")
    .eq("user_id", userId)
    .eq("store_id", storeId);

  if (error) {
    // Fallback si la migración 083 aún no está aplicada.
    const legacy = await supabase
      .from("customer_cart_items")
      .select("product_id, variant_id, quantity")
      .eq("user_id", userId)
      .eq("store_id", storeId);

    if (legacy.error) {
      throw new Error(legacy.error.message);
    }

    return (legacy.data ?? []).map((row) => ({
      productId: row.product_id,
      variantId: row.variant_id,
      quantity: row.quantity,
    }));
  }

  return (data ?? []).map((row) => ({
    productId: row.product_id,
    variantId: row.variant_id,
    quantity: row.quantity,
    modifiers: sanitizeModifiers(row.modifiers_json),
  }));
}

async function persistCartLines(
  userId: string,
  storeId: string,
  lines: CartLineInput[],
): Promise<void> {
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("customer_cart_items")
    .delete()
    .eq("user_id", userId)
    .eq("store_id", storeId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (lines.length === 0) return;

  const rowsWithModifiers = lines.map((line) => {
    const modifiers = sanitizeModifiers(line.modifiers) ?? [];
    return {
      user_id: userId,
      store_id: storeId,
      product_id: line.productId,
      variant_id: line.variantId,
      quantity: line.quantity,
      modifiers_json: modifiers,
      line_key: cartItemKey(line.productId, line.variantId, modifiers),
    };
  });

  const { error: insertError } = await supabase
    .from("customer_cart_items")
    .insert(rowsWithModifiers);

  if (!insertError) return;

  // Fallback sin columnas nuevas.
  const legacyRows = lines.map((line) => ({
    user_id: userId,
    store_id: storeId,
    product_id: line.productId,
    variant_id: line.variantId,
    quantity: line.quantity,
  }));

  const { error: legacyInsertError } = await supabase
    .from("customer_cart_items")
    .insert(legacyRows);

  if (legacyInsertError) {
    throw new Error(insertError.message || legacyInsertError.message);
  }
}

function toPersistLines(items: CartItem[]): CartLineInput[] {
  return items.map((item) => ({
    productId: item.product.product_id,
    variantId: item.variantId,
    quantity: item.quantity,
    modifiers: item.modifiers,
  }));
}

/** Carga el carrito del cliente desde Supabase e hidrata precios/stock actuales. */
export async function getCustomerCart(
  storeSlug: string,
): Promise<CustomerCartActionResult> {
  try {
    const access = await resolveCartAccess(storeSlug);
    if ("error" in access) {
      return { ok: false, error: access.error };
    }

    const lines = await fetchStoredCartLines(access.userId, access.storeId);
    const items = await hydrateCartLines(storeSlug, lines);

    if (items.length !== lines.length) {
      await persistCartLines(access.userId, access.storeId, toPersistLines(items));
    }

    return { ok: true, items };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo cargar el carrito.",
    };
  }
}

/** Reemplaza el carrito remoto con el estado local del cliente. */
export async function syncCustomerCart(
  storeSlug: string,
  lines: CartLineInput[],
): Promise<CustomerCartActionResult> {
  try {
    const access = await resolveCartAccess(storeSlug);
    if ("error" in access) {
      return { ok: false, error: access.error };
    }

    const sanitized = lines
      .filter((line) => line.quantity > 0)
      .map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        quantity: Math.floor(line.quantity),
        modifiers: sanitizeModifiers(line.modifiers),
      }));

    const items = await hydrateCartLines(storeSlug, sanitized);
    await persistCartLines(access.userId, access.storeId, toPersistLines(items));
    return { ok: true, items };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo sincronizar el carrito.",
    };
  }
}

/** Fusiona el carrito de invitado (localStorage) con el carrito remoto del cliente. */
export async function mergeGuestCart(
  storeSlug: string,
  guestLines: CartLineInput[],
): Promise<CustomerCartActionResult> {
  try {
    const access = await resolveCartAccess(storeSlug);
    if ("error" in access) {
      return { ok: false, error: access.error };
    }

    const serverLines = await fetchStoredCartLines(access.userId, access.storeId);
    const mergedLines = mergeCartLines(serverLines, guestLines);
    const items = await hydrateCartLines(storeSlug, mergedLines);
    await persistCartLines(access.userId, access.storeId, toPersistLines(items));
    return { ok: true, items };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo fusionar el carrito.",
    };
  }
}

/** Vacía el carrito remoto del cliente autenticado. */
export async function clearCustomerCart(
  storeSlug: string,
): Promise<CustomerCartActionResult> {
  try {
    const access = await resolveCartAccess(storeSlug);
    if ("error" in access) {
      return { ok: false, error: access.error };
    }

    await persistCartLines(access.userId, access.storeId, []);
    return { ok: true, items: [] };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo vaciar el carrito.",
    };
  }
}
