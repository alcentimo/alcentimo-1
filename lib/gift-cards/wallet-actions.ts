"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStoreBySlug } from "@/lib/stores";
import { isPlatformAdminOwnedStore } from "@/lib/gift-cards/admin-store";
import { normalizeGiftCardCode, roundGiftUsd } from "@/lib/gift-cards/code";
import { GIFT_CARD_STORE_DENIED_MESSAGE } from "@/lib/gift-cards/types";
import { getStoreCustomerAccountPath } from "@/lib/store-host";

export type StoreCreditResult = {
  error?: string;
  balanceUsd?: number;
  creditedUsd?: number;
};

async function requireAdminStoreAndUser(storeSlug: string) {
  const store = await getStoreBySlug(storeSlug);
  if (!store) {
    return { ok: false as const, error: "Tienda no encontrada." };
  }

  const adminOwned = await isPlatformAdminOwnedStore(store.id, store.owner_id);
  if (!adminOwned) {
    return { ok: false as const, error: GIFT_CARD_STORE_DENIED_MESSAGE };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false as const,
      error: "Inicia sesión para cargar el saldo en tu cuenta.",
    };
  }

  return { ok: true as const, store, user };
}

export async function getCustomerStoreCredit(
  storeSlug: string,
): Promise<StoreCreditResult> {
  const auth = await requireAdminStoreAndUser(storeSlug);
  if (!auth.ok) {
    if (auth.error === GIFT_CARD_STORE_DENIED_MESSAGE) {
      return { balanceUsd: 0 };
    }
    return { balanceUsd: 0 };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customer_store_credits")
    .select("balance_usd")
    .eq("store_id", auth.store.id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) return { error: error.message, balanceUsd: 0 };
  return {
    balanceUsd: roundGiftUsd(Number((data as { balance_usd?: number } | null)?.balance_usd ?? 0)),
  };
}

/** Carga el saldo restante de una gift card al perfil del cliente. */
export async function applyGiftCardToWallet(
  storeSlug: string,
  code: string,
): Promise<StoreCreditResult> {
  const auth = await requireAdminStoreAndUser(storeSlug);
  if (!auth.ok) return { error: auth.error };

  const normalized = normalizeGiftCardCode(code);
  if (!normalized) {
    return { error: "Ingresa un código de tarjeta de regalo." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("apply_gift_card_to_wallet" as never, {
    p_code: normalized,
    p_store_id: auth.store.id,
    p_user_id: auth.user.id,
  } as never);

  if (error) return { error: error.message };

  const result = data as {
    error?: string;
    success?: boolean;
    credited_usd?: number;
    wallet_usd?: number;
  } | null;

  if (!result || result.error || !result.success) {
    return { error: result?.error ?? "No se pudo cargar la tarjeta." };
  }

  revalidatePath(getStoreCustomerAccountPath(auth.store.slug, "perfil"));
  revalidatePath(`/c/${auth.store.slug}`);

  return {
    creditedUsd: roundGiftUsd(Number(result.credited_usd ?? 0)),
    balanceUsd: roundGiftUsd(Number(result.wallet_usd ?? 0)),
  };
}
