"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";
import {
  getAdminOwnedStoreForUser,
  isPlatformAdminOwnedStore,
} from "@/lib/gift-cards/admin-store";
import { generateGiftCardCode, roundGiftUsd } from "@/lib/gift-cards/code";
import type { GiftCard, GiftCardStatus } from "@/lib/gift-cards/types";

type ActionResult<T extends object = object> = {
  error?: string;
} & Partial<T>;

async function requireSupportAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isSupportAdmin(resolveAuthEmail(user))) {
    return { ok: false as const, error: "No tienes permiso de administrador." };
  }
  return { ok: true as const, user };
}

function mapGiftCard(row: Record<string, unknown>): GiftCard {
  return {
    id: String(row.id),
    store_id: String(row.store_id),
    code: String(row.code),
    initial_balance_usd: Number(row.initial_balance_usd),
    current_balance_usd: Number(row.current_balance_usd),
    status: row.status as GiftCardStatus,
    note: row.note != null ? String(row.note) : null,
    created_by: row.created_by != null ? String(row.created_by) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function listAdminGiftCards(): Promise<
  ActionResult<{ cards: GiftCard[]; storeName: string | null }>
> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const store = await getAdminOwnedStoreForUser(auth.user.id);
  if (!store) {
    return {
      cards: [],
      storeName: null,
      error:
        "No hay una tienda de administrador vinculada a tu cuenta. Crea o activa tu vitrina para emitir tarjetas.",
    };
  }

  const owned = await isPlatformAdminOwnedStore(store.id, auth.user.id);
  if (!owned) {
    return { error: "Esta tienda no es la vitrina del administrador." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("gift_cards")
    .select("*")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return { error: error.message };

  return {
    cards: ((data as Record<string, unknown>[] | null) ?? []).map(mapGiftCard),
    storeName: store.name,
  };
}

export async function createAdminGiftCards(input: {
  initialBalanceUsd: number;
  quantity?: number;
  note?: string;
}): Promise<ActionResult<{ cards: GiftCard[] }>> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const store = await getAdminOwnedStoreForUser(auth.user.id);
  if (!store) {
    return {
      error:
        "No hay una tienda de administrador vinculada a tu cuenta. No se pueden emitir tarjetas.",
    };
  }

  const owned = await isPlatformAdminOwnedStore(store.id, auth.user.id);
  if (!owned) {
    return { error: "Esta tienda no es la vitrina del administrador." };
  }

  const balance = roundGiftUsd(Number(input.initialBalanceUsd));
  if (!Number.isFinite(balance) || balance < 1) {
    return { error: "El saldo inicial debe ser al menos $1.00." };
  }
  if (balance > 50000) {
    return { error: "El saldo inicial no puede superar $50,000." };
  }

  const quantity = Math.min(20, Math.max(1, Math.floor(input.quantity ?? 1)));
  const note = input.note?.trim().slice(0, 240) || null;

  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < quantity; i += 1) {
    rows.push({
      store_id: store.id,
      code: generateGiftCardCode(),
      initial_balance_usd: balance,
      current_balance_usd: balance,
      status: "active",
      note,
      created_by: auth.user.id,
    });
  }

  const admin = createAdminClient();
  let lastError: string | null = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data, error } = await admin
      .from("gift_cards")
      .insert(rows)
      .select("*");
    if (!error) {
      revalidatePath("/admin/dashboard");
      return {
        cards: ((data as Record<string, unknown>[] | null) ?? []).map(
          mapGiftCard,
        ),
      };
    }
    lastError = error.message;
    if (!/duplicate|unique/i.test(error.message)) {
      return { error: error.message };
    }
    for (const row of rows) {
      row.code = generateGiftCardCode();
    }
  }

  return { error: lastError ?? "No se pudo generar un código único." };
}

export async function setAdminGiftCardStatus(
  cardId: string,
  status: Extract<GiftCardStatus, "active" | "disabled">,
): Promise<ActionResult<{ card: GiftCard }>> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const store = await getAdminOwnedStoreForUser(auth.user.id);
  if (!store) {
    return { error: "No hay una tienda de administrador vinculada." };
  }

  const admin = createAdminClient();
  const { data: existing, error: lookupError } = await admin
    .from("gift_cards")
    .select("*")
    .eq("id", cardId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (lookupError) return { error: lookupError.message };
  if (!existing) return { error: "Tarjeta no encontrada." };

  const card = mapGiftCard(existing as Record<string, unknown>);
  if (card.status === "depleted") {
    return { error: "Una tarjeta agotada no se puede reactivar." };
  }

  const nextStatus: GiftCardStatus =
    status === "active" && card.current_balance_usd <= 0
      ? "depleted"
      : status;

  const { data, error } = await admin
    .from("gift_cards")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", cardId)
    .eq("store_id", store.id)
    .select("*")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/dashboard");
  return { card: mapGiftCard(data as Record<string, unknown>) };
}
