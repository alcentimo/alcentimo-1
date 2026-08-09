"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { getUserStore } from "@/lib/stores";
import { getSupabaseAnonClient } from "@/lib/supabase";
import type { Coupon, CouponInsert } from "@/lib/database.types";
import type { CouponDiscountType } from "@/lib/coupons/types";
import {
  isCouponExpired,
  isCouponNotYetActive,
  parseDateInputToEndIso,
  parseDateInputToStartIso,
} from "@/lib/coupons/dates";
import { getEligibleCartProductIds } from "@/lib/coupons/discount";

export type CouponActionResult = { error?: string; success?: boolean };

export type ValidateCouponResult = {
  error?: string;
  code?: string;
  discountType?: CouponDiscountType;
  discountPercent?: number | null;
  discountFixedUsd?: number | null;
  isGlobal?: boolean;
  productIds?: string[];
  eligibleProductIds?: string[];
};

function normalizeCoupon(row: Coupon): Coupon {
  return {
    ...row,
    discount_type: (row.discount_type ?? "percent") as CouponDiscountType,
    discount_percent:
      row.discount_percent != null ? Number(row.discount_percent) : null,
    discount_fixed_usd:
      row.discount_fixed_usd != null ? Number(row.discount_fixed_usd) : null,
    is_global: Boolean(row.is_global ?? true),
    product_ids: Array.isArray(row.product_ids) ? row.product_ids : [],
    max_uses: Number(row.max_uses),
    use_count: Number(row.use_count),
  };
}

export async function getStoreCoupons(storeId: string): Promise<Coupon[]> {
  const client = await createClient();
  const { data, error } = await client
    .from("coupons")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => normalizeCoupon(row as Coupon));
}

export async function createCoupon(input: {
  code: string;
  discountType: CouponDiscountType;
  discountPercent?: number;
  discountFixedUsd?: number;
  maxUses: number;
  startDate?: string;
  endDate?: string;
  isGlobal: boolean;
  productIds: string[];
}): Promise<CouponActionResult> {
  const supabaseClient = await createClient();
  const auth = await requireAuthStore(supabaseClient);
  if (!auth.ok) return { error: auth.error };

  const { store } = auth;

  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]+$/.test(code)) {
    return { error: "Código inválido. Usa letras, números, guiones o guion bajo." };
  }
  if (!Number.isFinite(input.maxUses) || input.maxUses < 0) {
    return { error: "Máximo de usos inválido." };
  }
  if (!input.endDate?.trim()) {
    return { error: "La fecha de fin es obligatoria." };
  }

  if (input.discountType === "percent") {
    if (
      !Number.isFinite(input.discountPercent) ||
      (input.discountPercent ?? 0) <= 0 ||
      (input.discountPercent ?? 0) > 100
    ) {
      return { error: "Porcentaje de descuento inválido." };
    }
  } else if (
    !Number.isFinite(input.discountFixedUsd) ||
    (input.discountFixedUsd ?? 0) <= 0
  ) {
    return { error: "Monto fijo de descuento inválido." };
  }

  const isGlobal = input.isGlobal;
  const productIds = isGlobal ? [] : [...new Set(input.productIds)];
  if (!isGlobal && productIds.length === 0) {
    return { error: "Selecciona al menos un producto o aplica el cupón a toda la tienda." };
  }

  const startDateIso = parseDateInputToStartIso(input.startDate ?? "");
  const endDateIso = parseDateInputToEndIso(input.endDate);
  if (!endDateIso) {
    return { error: "Fecha de fin inválida." };
  }
  if (startDateIso && new Date(startDateIso) > new Date(endDateIso)) {
    return { error: "La fecha de inicio no puede ser posterior a la de fin." };
  }

  if (!isGlobal) {
    const { data: ownedProducts, error: productsError } = await supabaseClient
      .from("products")
      .select("id")
      .eq("store_id", store.id)
      .in("id", productIds);

    if (productsError) return { error: productsError.message };
    if ((ownedProducts ?? []).length !== productIds.length) {
      return { error: "Uno o más productos no pertenecen a tu tienda." };
    }
  }

  const payload: CouponInsert = {
    store_id: store.id,
    code,
    discount_type: input.discountType,
    discount_percent:
      input.discountType === "percent" ? input.discountPercent ?? null : null,
    discount_fixed_usd:
      input.discountType === "fixed" ? input.discountFixedUsd ?? null : null,
    max_uses: Math.floor(input.maxUses),
    is_active: true,
    is_global: isGlobal,
    product_ids: productIds,
    start_date: startDateIso,
    end_date: endDateIso,
  };

  const { error } = await supabaseClient.from("coupons").insert(payload as never);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/ajustes");
  return { success: true };
}

export async function toggleCouponActive(
  couponId: string,
  isActive: boolean,
): Promise<CouponActionResult> {
  const supabaseClient = await createClient();
  const store = await getUserStore(supabaseClient);
  if (!store) return { error: "No tienes una tienda asociada." };

  const { error } = await supabaseClient
    .from("coupons")
    .update({ is_active: isActive } as never)
    .eq("id", couponId)
    .eq("store_id", store.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/ajustes");
  return { success: true };
}

export async function deleteCoupon(couponId: string): Promise<CouponActionResult> {
  const supabaseClient = await createClient();
  const store = await getUserStore(supabaseClient);
  if (!store) return { error: "No tienes una tienda asociada." };

  const { error } = await supabaseClient
    .from("coupons")
    .delete()
    .eq("id", couponId)
    .eq("store_id", store.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/ajustes");
  return { success: true };
}

export async function validateCouponCode(
  storeSlug: string,
  code: string,
  cartProductIds: string[] = [],
): Promise<ValidateCouponResult> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { error: "Ingresa un código de cupón." };

  const supabase = getSupabaseAnonClient();

  const { data: storeData, error: storeError } = await supabase
    .from("stores")
    .select("id")
    .eq("slug", storeSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (storeError) return { error: storeError.message };

  const storeRow = storeData as { id: string } | null;
  if (!storeRow?.id) return { error: "Tienda no encontrada." };

  const { data, error } = await supabase
    .from("coupons")
    .select(
      "code, discount_type, discount_percent, discount_fixed_usd, max_uses, use_count, is_active, start_date, end_date, is_global, product_ids",
    )
    .eq("store_id", storeRow.id)
    .eq("is_active", true)
    .ilike("code", normalized)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Cupón no válido o inactivo." };

  const coupon = data as {
    code: string;
    discount_type: CouponDiscountType;
    discount_percent: number | null;
    discount_fixed_usd: number | null;
    max_uses: number;
    use_count: number;
    is_active: boolean;
    start_date: string | null;
    end_date: string | null;
    is_global: boolean;
    product_ids: string[];
  };

  if (isCouponNotYetActive(coupon.start_date)) {
    return { error: "Este cupón aún no está disponible." };
  }

  if (isCouponExpired(coupon.end_date)) {
    return { error: "Cupón expirado" };
  }

  const maxUses = Number(coupon.max_uses);
  const useCount = Number(coupon.use_count);
  if (maxUses > 0 && useCount >= maxUses) {
    return { error: "Este cupón ya alcanzó el límite de usos." };
  }

  const isGlobal = Boolean(coupon.is_global);
  const productIds = Array.isArray(coupon.product_ids) ? coupon.product_ids : [];
  const eligibleProductIds = getEligibleCartProductIds(
    cartProductIds,
    isGlobal,
    productIds,
  );

  if (cartProductIds.length > 0 && eligibleProductIds.length === 0) {
    return {
      error: "Este cupón no aplica a los productos de tu carrito.",
    };
  }

  return {
    code: String(coupon.code),
    discountType: coupon.discount_type ?? "percent",
    discountPercent:
      coupon.discount_percent != null ? Number(coupon.discount_percent) : null,
    discountFixedUsd:
      coupon.discount_fixed_usd != null ? Number(coupon.discount_fixed_usd) : null,
    isGlobal,
    productIds,
    eligibleProductIds,
  };
}

export async function redeemCouponCode(
  storeSlug: string,
  code: string,
): Promise<CouponActionResult> {
  if (!code.trim()) return { success: true };

  const { data, error } = await getSupabaseAnonClient().rpc(
    "redeem_coupon" as never,
    {
      p_store_slug: storeSlug,
      p_code: code.trim(),
    } as never,
  );

  if (error) return { error: error.message };

  const result = data as { error?: string; success?: boolean } | null;
  if (result?.error) return { error: result.error };
  return { success: true };
}
