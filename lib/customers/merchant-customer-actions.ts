"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import {
  formatCustomerOrderDate,
  formatCustomerOrderPublicId,
  type CustomerOrderSummary,
} from "@/lib/customers/get-customer-orders";
import { isStoreOwner } from "@/lib/stores/owner-access";
import { isValidOrderEstado, type OrderEstado } from "@/lib/orders/order-status";

function parseOrderEstado(value: unknown): OrderEstado {
  const raw = String(value ?? "pendiente");
  return isValidOrderEstado(raw) ? raw : "pendiente";
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
      .select("id, total_usd, estado, created_at")
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
    (row) => ({
      id: row.id,
      total_usd: Number(row.total_usd) || 0,
      estado: parseOrderEstado(row.estado),
      created_at: row.created_at,
      publicId: formatCustomerOrderPublicId(row.id),
      formattedDate: formatCustomerOrderDate(row.created_at),
    }),
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
