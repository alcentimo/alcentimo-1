"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthUser } from "@/lib/auth/require-dashboard-auth";
import {
  findSubscriptionCouponByCode,
  redeemGrantProCouponForUser,
  resolveAmountWithPromo,
  getActiveSubscriptionCampaign,
} from "@/lib/plans/subscription-promo";
import { isCouponWindowOpen, normalizePromoCode } from "@/lib/admin/growth-discount";
import { manualPaymentPlanToDbPlan } from "@/lib/plans/plan-activation";
import type { ManualPaymentPlanId } from "@/lib/database.types";

export type ValidateCouponResult = {
  error?: string;
  success?: boolean;
  rewardType?: string;
  label?: string;
  discountUsd?: number;
  amountDueUsd?: number;
  grantProDays?: number;
};

export async function validateSubscriptionCouponCode(input: {
  code: string;
  planId: ManualPaymentPlanId;
  listAmountUsd: number;
}): Promise<ValidateCouponResult> {
  const supabase = await createClient();
  const auth = await requireAuthUser(supabase);
  if (!auth.ok) return { error: auth.error };

  const coupon = await findSubscriptionCouponByCode(input.code);
  if (!coupon || !coupon.is_active) return { error: "Cupón no válido." };
  if (!isCouponWindowOpen(coupon)) return { error: "Cupón fuera de vigencia." };
  if (
    coupon.max_redemptions != null &&
    coupon.redemption_count >= coupon.max_redemptions
  ) {
    return { error: "Cupón agotado." };
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("subscription_coupon_redemptions")
    .select("id")
    .eq("coupon_id", coupon.id)
    .eq("user_id", auth.authUser.id)
    .maybeSingle();
  if (existing) return { error: "Ya usaste este cupón." };

  if (coupon.reward_type === "grant_pro_days") {
    return {
      success: true,
      rewardType: coupon.reward_type,
      grantProDays: coupon.grant_pro_days ?? undefined,
      label: `${coupon.code}: ${coupon.grant_pro_days} días Pro`,
    };
  }

  const planDb = manualPaymentPlanToDbPlan(input.planId);
  const paidPlan = planDb === "BUSINESS" ? "BUSINESS" : "PRO";
  const resolved = resolveAmountWithPromo({
    listAmountUsd: input.listAmountUsd,
    planDb: paidPlan,
    coupon,
  });

  return {
    success: true,
    rewardType: coupon.reward_type,
    label: resolved.label,
    discountUsd: resolved.discountUsd,
    amountDueUsd: resolved.amountDueUsd,
  };
}

export async function redeemSubscriptionCouponCode(
  code: string,
): Promise<{ error?: string; success?: boolean; days?: number }> {
  const supabase = await createClient();
  const auth = await requireAuthUser(supabase);
  if (!auth.ok) return { error: auth.error };

  return redeemGrantProCouponForUser({
    userId: auth.authUser.id,
    code: normalizePromoCode(code),
  });
}

export async function dismissPromoOffer(
  offerId: string,
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const auth = await requireAuthUser(supabase);
  if (!auth.ok) return { error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("user_promo_offers")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", offerId)
    .eq("user_id", auth.authUser.id);

  if (error) return { error: error.message };
  revalidatePath("/activar");
  revalidatePath("/dashboard/planes");
  return { success: true };
}

export async function previewCheckoutDiscount(input: {
  planId: ManualPaymentPlanId;
  listAmountUsd: number;
  couponCode?: string | null;
}): Promise<ValidateCouponResult> {
  const planDbRaw = manualPaymentPlanToDbPlan(input.planId);
  const planDb = planDbRaw === "BUSINESS" ? "BUSINESS" : "PRO";
  const campaign = await getActiveSubscriptionCampaign(planDb);
  const coupon = input.couponCode
    ? await findSubscriptionCouponByCode(input.couponCode)
    : null;

  if (coupon?.reward_type === "grant_pro_days") {
    return {
      error:
        "Este cupón regala días Pro. Canjéalo en el campo de cupón de la pantalla de activación.",
    };
  }

  const discountCoupon =
    coupon &&
    (coupon.reward_type === "percent_discount" ||
      coupon.reward_type === "fixed_discount")
      ? coupon
      : null;

  const resolved = resolveAmountWithPromo({
    listAmountUsd: input.listAmountUsd,
    planDb,
    coupon: discountCoupon,
    campaign,
  });

  return {
    success: true,
    label: resolved.label,
    discountUsd: resolved.discountUsd,
    amountDueUsd: resolved.amountDueUsd,
  };
}
