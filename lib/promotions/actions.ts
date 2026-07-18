"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import {
  parseDateInputToEndIso,
  parseDateInputToStartIso,
} from "@/lib/coupons/dates";
import type { Promotion } from "@/lib/promotions/types";

export type PromotionActionResult = { error?: string; success?: boolean };

export type ValidatePromotionResult = {
  error?: string;
  code?: string;
  name?: string;
  discountPercent?: number;
};

function normalizePromotion(row: Promotion): Promotion {
  return {
    ...row,
    discount_percentage: Number(row.discount_percentage) || 0,
    max_uses: Number(row.max_uses) || 0,
    use_count: Number(row.use_count) || 0,
    auto_apply: Boolean(row.auto_apply),
    is_active: Boolean(row.is_active),
  };
}

export async function getStorePromotions(storeId: string): Promise<Promotion[]> {
  const client = await createClient();
  const { data, error } = await client
    .from("promotions")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => normalizePromotion(row as Promotion));
}

export async function createPromotion(input: {
  name: string;
  discountPercentage: number;
  code: string;
  startDate?: string;
  endDate: string;
  autoApply?: boolean;
  maxUses?: number;
}): Promise<PromotionActionResult> {
  const supabaseClient = await createClient();
  const auth = await requireAuthStore(supabaseClient);
  if (!auth.ok) return { error: auth.error };

  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();

  if (name.length < 2) {
    return { error: "El nombre de la promoción es obligatorio." };
  }
  if (!/^[A-Z0-9_-]+$/.test(code)) {
    return { error: "Código inválido. Usa letras, números, guiones o guion bajo." };
  }
  if (
    !Number.isFinite(input.discountPercentage) ||
    input.discountPercentage <= 0 ||
    input.discountPercentage > 100
  ) {
    return { error: "Porcentaje de descuento inválido." };
  }
  if (!input.endDate.trim()) {
    return { error: "La fecha de fin es obligatoria." };
  }

  const startDateIso = parseDateInputToStartIso(input.startDate ?? "");
  const endDateIso = parseDateInputToEndIso(input.endDate);
  if (!endDateIso) {
    return { error: "Fecha de fin inválida." };
  }
  if (startDateIso && new Date(startDateIso) > new Date(endDateIso)) {
    return { error: "La fecha de inicio no puede ser posterior a la de fin." };
  }

  const maxUses = Math.max(0, Math.floor(input.maxUses ?? 0));

  const { error } = await supabaseClient.from("promotions").insert({
    store_id: auth.store.id,
    name,
    code,
    discount_percentage: input.discountPercentage,
    start_date: startDateIso,
    end_date: endDateIso,
    is_active: true,
    auto_apply: input.autoApply ?? true,
    max_uses: maxUses,
  } as never);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/ajustes");
  revalidatePath(`/c/${auth.store.slug}`);
  return { success: true };
}

export async function togglePromotionActive(
  promotionId: string,
  isActive: boolean,
): Promise<PromotionActionResult> {
  const supabaseClient = await createClient();
  const auth = await requireAuthStore(supabaseClient);
  if (!auth.ok) return { error: auth.error };

  const { error } = await supabaseClient
    .from("promotions")
    .update({ is_active: isActive } as never)
    .eq("id", promotionId)
    .eq("store_id", auth.store.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/ajustes");
  revalidatePath(`/c/${auth.store.slug}`);
  return { success: true };
}

export async function deletePromotion(
  promotionId: string,
): Promise<PromotionActionResult> {
  const supabaseClient = await createClient();
  const auth = await requireAuthStore(supabaseClient);
  if (!auth.ok) return { error: auth.error };

  const { error } = await supabaseClient
    .from("promotions")
    .delete()
    .eq("id", promotionId)
    .eq("store_id", auth.store.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/ajustes");
  revalidatePath(`/c/${auth.store.slug}`);
  return { success: true };
}

export async function validateCustomerPromotionCode(
  storeSlug: string,
  code: string,
): Promise<ValidatePromotionResult> {
  const normalized = code.trim();
  if (!normalized) {
    return { error: "Ingresa un código de promoción." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc(
    "validate_customer_promotion" as never,
    {
      p_store_slug: storeSlug,
      p_code: normalized,
      p_user_id: user?.id ?? null,
    } as never,
  );

  if (error) return { error: error.message };

  const result = data as {
    error?: string;
    success?: boolean;
    code?: string;
    name?: string;
    discount_percentage?: number;
  } | null;

  if (!result || result.error) {
    return { error: result?.error ?? "Promoción no válida." };
  }

  return {
    code: result.code,
    name: result.name,
    discountPercent: Number(result.discount_percentage) || 0,
  };
}

export async function redeemCustomerPromotionCode(
  storeSlug: string,
  code: string,
): Promise<PromotionActionResult> {
  const normalized = code.trim();
  if (!normalized) return { success: true };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Debes iniciar sesión como cliente para usar la promoción." };
  }

  const { data, error } = await supabase.rpc(
    "redeem_customer_promotion" as never,
    {
      p_store_slug: storeSlug,
      p_code: normalized,
      p_user_id: user.id,
    } as never,
  );

  if (error) return { error: error.message };

  const result = data as { error?: string; success?: boolean } | null;
  if (result?.error) return { error: result.error };
  return { success: true };
}
