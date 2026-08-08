"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import {
  formatCustomerOrderDate,
  formatCustomerOrderPublicId,
  type CustomerOrderSummary,
} from "@/lib/customers/customer-orders-shared";
import { isStoreOwner } from "@/lib/stores/owner-access";
import { normalizeOrderEstado, type OrderEstado } from "@/lib/orders/order-status";

function parseOrderEstado(value: unknown): OrderEstado {
  return normalizeOrderEstado(value);
}

async function requireStoreOwnerContext() {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) {
    return { ok: false as const, error: auth.error };
  }

  if (!isStoreOwner(auth.store, auth.authUser.id)) {
    return { ok: false as const, error: "Solo el dueño de la tienda puede gestionar clientes." };
  }

  return { ok: true as const, supabase, store: auth.store };
}

export interface MerchantCustomerOrderRow extends CustomerOrderSummary {
  publicId: string;
  formattedDate: string;
}

export type FetchCustomerDetailResult =
  | {
      ok: true;
      orders: MerchantCustomerOrderRow[];
      merchantNotes: string;
    }
  | { ok: false; error: string };

export async function fetchCustomerDetail(
  customerUserId: string,
): Promise<FetchCustomerDetailResult> {
  const context = await requireStoreOwnerContext();
  if (!context.ok) return context;

  const { supabase, store } = context;
  const normalizedUserId = customerUserId.trim();
  if (!normalizedUserId) {
    return { ok: false, error: "Cliente no válido." };
  }

  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("id")
    .eq("store_id", store.id)
    .eq("user_id", normalizedUserId)
    .maybeSingle();

  if (!profile) {
    return { ok: false, error: "Cliente no encontrado en esta tienda." };
  }

  const [ordersResult, notesResult] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, store_id, total_usd, estado, created_at, fulfillment_type, shipping_method, shipping_branch_name, delivery_address, tracking_number, items",
      )
      .eq("store_id", store.id)
      .eq("customer_user_id", normalizedUserId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("customer_merchant_notes")
      .select("body")
      .eq("store_id", store.id)
      .eq("customer_user_id", normalizedUserId)
      .maybeSingle(),
  ]);

  if (ordersResult.error) {
    return { ok: false, error: ordersResult.error.message };
  }
  if (notesResult.error) {
    return { ok: false, error: notesResult.error.message };
  }

  const orders: MerchantCustomerOrderRow[] = (ordersResult.data ?? []).map(
    (row) => {
      const items = Array.isArray(row.items) ? row.items : [];
      const itemCount = items.reduce((sum, item) => {
        if (!item || typeof item !== "object") return sum;
        const quantity = Number((item as { quantity?: unknown }).quantity) || 0;
        return sum + Math.max(0, quantity);
      }, 0);

      return {
        id: row.id,
        store_id: (row.store_id as string) || store.id,
        total_usd: Number(row.total_usd) || 0,
        estado: parseOrderEstado(row.estado),
        created_at: row.created_at,
        fulfillment_type:
          (row.fulfillment_type as MerchantCustomerOrderRow["fulfillment_type"]) ??
          null,
        shipping_method: (row.shipping_method as string | null) ?? null,
        shipping_branch_name:
          (row.shipping_branch_name as string | null) ?? null,
        delivery_address: (row.delivery_address as string | null) ?? null,
        tracking_number: (row.tracking_number as string | null) ?? null,
        item_count: itemCount,
        publicId: formatCustomerOrderPublicId(row.id),
        formattedDate: formatCustomerOrderDate(row.created_at),
      };
    },
  );

  return {
    ok: true,
    orders,
    merchantNotes: notesResult.data?.body ?? "",
  };
}

export type SaveCustomerNotesResult =
  | { ok: true; merchantNotes: string }
  | { ok: false; error: string };

export async function saveCustomerMerchantNotes(input: {
  customerUserId: string;
  notes: string;
}): Promise<SaveCustomerNotesResult> {
  const context = await requireStoreOwnerContext();
  if (!context.ok) return context;

  const { supabase, store } = context;
  const customerUserId = input.customerUserId.trim();
  if (!customerUserId) {
    return { ok: false, error: "Cliente no válido." };
  }

  const body = input.notes.trim().slice(0, 4000);

  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("id")
    .eq("store_id", store.id)
    .eq("user_id", customerUserId)
    .maybeSingle();

  if (!profile) {
    return { ok: false, error: "Cliente no encontrado en esta tienda." };
  }

  const { error } = await supabase.from("customer_merchant_notes").upsert(
    {
      store_id: store.id,
      customer_user_id: customerUserId,
      body,
    },
    { onConflict: "store_id,customer_user_id" },
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, merchantNotes: body };
}
