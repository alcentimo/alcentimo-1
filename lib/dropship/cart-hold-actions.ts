"use server";

import type { CartLineInput } from "@/lib/catalog/cart-lines";
import { resolveActiveStoreBySlug } from "@/lib/customers/middleware-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  DROPSHIP_CART_HOLD_TTL_MINUTES,
  getOrCreateDropshipHoldSessionKey,
  readDropshipHoldSessionKey,
} from "@/lib/dropship/cart-hold-session";
import { releaseExpiredDropshipStockHolds } from "@/lib/dropship/supplier-stock";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DropshipCartHoldView = {
  productId: string;
  supplierProductId: string;
  quantity: number;
  expiresAt: string | null;
};

export type SyncDropshipCartHoldsResult =
  | { ok: true; holds: DropshipCartHoldView[] }
  | { ok: false; error: string };

type SyncRpc = {
  ok?: boolean;
  error?: string;
  affected_ids?: string[];
  holds?: Array<{
    product_id?: string;
    supplier_product_id?: string;
    quantity?: number;
    expires_at?: string;
  }>;
};

async function remirrorAffected(
  admin: SupabaseClient,
  ids: string[] | undefined,
) {
  const unique = [...new Set((ids ?? []).filter(Boolean))];
  const { mirrorSupplierStockToLinkedStores, loadSupplierAvailableStock } =
    await import("@/lib/dropship/supplier-stock");
  for (const id of unique) {
    const available = await loadSupplierAvailableStock(admin, id);
    await mirrorSupplierStockToLinkedStores(admin, id, available);
  }
}

export async function syncDropshipCartHolds(
  storeSlug: string,
  lines: CartLineInput[],
): Promise<SyncDropshipCartHoldsResult> {
  const slug = storeSlug.trim().toLowerCase();
  if (!slug) return { ok: false, error: "Tienda no válida." };

  try {
    const supabase = await createClient();
    const store = await resolveActiveStoreBySlug(supabase, slug);
    if (!store) return { ok: false, error: "Tienda no encontrada." };

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const sessionKey = user
      ? await readDropshipHoldSessionKey()
      : await getOrCreateDropshipHoldSessionKey();

    const admin = createAdminClient();
    const payload = lines
      .filter((line) => line.quantity > 0 && line.productId)
      .map((line) => ({
        product_id: line.productId,
        variant_id: line.variantId,
        quantity: Math.max(1, Math.floor(line.quantity)),
      }));

    const { data, error } = await admin.rpc("sync_dropship_cart_holds", {
      p_store_id: store.id,
      p_customer_user_id: user?.id ?? null,
      p_session_key: sessionKey,
      p_lines: payload,
      p_ttl_minutes: DROPSHIP_CART_HOLD_TTL_MINUTES,
    });

    if (error) {
      if (/sync_dropship_cart_holds|Could not find the function|schema cache/i.test(error.message)) {
        return { ok: true, holds: [] };
      }
      return { ok: false, error: error.message };
    }

    const result = data as SyncRpc | null;
    if (result && result.ok === false) {
      return { ok: false, error: result.error ?? "No se pudo reservar el stock." };
    }

    await remirrorAffected(admin, result?.affected_ids);

    const holds: DropshipCartHoldView[] = (result?.holds ?? [])
      .map((row) => ({
        productId: String(row.product_id ?? ""),
        supplierProductId: String(row.supplier_product_id ?? ""),
        quantity: Math.max(0, Math.floor(Number(row.quantity) || 0)),
        expiresAt:
          typeof row.expires_at === "string" && row.expires_at
            ? row.expires_at
            : null,
      }))
      .filter((row) => row.productId && row.quantity > 0);

    return { ok: true, holds };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo reservar el stock del carrito.",
    };
  }
}

export async function claimDropshipCartHoldsForCustomer(
  storeId: string,
): Promise<void> {
  const sessionKey = await readDropshipHoldSessionKey();
  if (!sessionKey) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const admin = createAdminClient();
  await admin.rpc("claim_dropship_cart_holds", {
    p_store_id: storeId,
    p_session_key: sessionKey,
    p_customer_user_id: user.id,
  });
}

export async function purgeExpiredDropshipCartHolds(): Promise<{
  error?: string;
  affectedIds: string[];
}> {
  const admin = createAdminClient();
  return releaseExpiredDropshipStockHolds(admin);
}
