"use server";

import { getStoreBySlug } from "@/lib/stores";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformAdminOwnedStore } from "@/lib/gift-cards/admin-store";
import { normalizeGiftCardCode, roundGiftUsd } from "@/lib/gift-cards/code";
import {
  GIFT_CARD_STORE_DENIED_MESSAGE,
  type GiftCard,
} from "@/lib/gift-cards/types";

export type ValidateGiftCardResult = {
  error?: string;
  code?: string;
  currentBalanceUsd?: number;
};

function mapGiftCard(row: Record<string, unknown>): GiftCard {
  return {
    id: String(row.id),
    store_id: String(row.store_id),
    code: String(row.code),
    initial_balance_usd: Number(row.initial_balance_usd),
    current_balance_usd: Number(row.current_balance_usd),
    status: row.status as GiftCard["status"],
    note: row.note != null ? String(row.note) : null,
    created_by: row.created_by != null ? String(row.created_by) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

/**
 * Valida una tarjeta solo si la vitrina es la tienda del administrador.
 * En cualquier otra tienda responde el mismo error genérico (sin filtrar existencia).
 */
export async function validateGiftCardCode(
  storeSlug: string,
  code: string,
): Promise<ValidateGiftCardResult> {
  const normalized = normalizeGiftCardCode(code);
  if (!normalized) {
    return { error: "Ingresa un código de tarjeta de regalo." };
  }

  const store = await getStoreBySlug(storeSlug);
  if (!store) return { error: "Tienda no encontrada." };

  const adminOwned = await isPlatformAdminOwnedStore(store.id, store.owner_id);
  if (!adminOwned) {
    return { error: GIFT_CARD_STORE_DENIED_MESSAGE };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("gift_cards")
    .select("*")
    .eq("code", normalized)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Tarjeta de regalo no válida." };

  const card = mapGiftCard(data as Record<string, unknown>);
  if (card.store_id !== store.id) {
    return { error: GIFT_CARD_STORE_DENIED_MESSAGE };
  }
  if (card.status === "disabled") {
    return { error: "Esta tarjeta de regalo está desactivada." };
  }
  if (card.status === "depleted" || card.current_balance_usd <= 0) {
    return { error: "Esta tarjeta de regalo no tiene saldo." };
  }
  if (card.status !== "active") {
    return { error: "Esta tarjeta de regalo no está disponible." };
  }

  return {
    code: card.code,
    currentBalanceUsd: roundGiftUsd(card.current_balance_usd),
  };
}
