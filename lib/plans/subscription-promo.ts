import { createAdminClient } from "@/lib/supabase/admin";
import type {
  SubscriptionCampaign,
  SubscriptionCoupon,
} from "@/lib/database.types";
import {
  applyDiscountToAmount,
  campaignAppliesToPlan,
  isCampaignActiveNow,
  isCouponWindowOpen,
  normalizePromoCode,
} from "@/lib/admin/growth-discount";
import { buildPaidProfilePatch } from "@/lib/plans/plan-activation";
import { revalidatePath } from "next/cache";

export type ResolvedPlanDiscount = {
  amountDueUsd: number;
  discountUsd: number;
  couponCode?: string;
  campaignId?: string;
  label: string;
};

export async function getActiveSubscriptionCampaign(
  planDb: "PRO" | "BUSINESS",
): Promise<SubscriptionCampaign | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subscription_campaigns")
    .select("*")
    .eq("is_active", true)
    .order("starts_at", { ascending: false })
    .limit(20);

  if (error || !data?.length) return null;

  const now = new Date();
  for (const row of data as SubscriptionCampaign[]) {
    if (!isCampaignActiveNow(row, now)) continue;
    if (!campaignAppliesToPlan(row, planDb)) continue;
    return row;
  }
  return null;
}

export async function findSubscriptionCouponByCode(
  codeRaw: string,
): Promise<SubscriptionCoupon | null> {
  const code = normalizePromoCode(codeRaw);
  if (!code) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subscription_coupons")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error || !data) return null;
  return data as SubscriptionCoupon;
}

export function resolveAmountWithPromo(input: {
  listAmountUsd: number;
  planDb: "PRO" | "BUSINESS";
  coupon?: SubscriptionCoupon | null;
  campaign?: SubscriptionCampaign | null;
}): ResolvedPlanDiscount {
  const { listAmountUsd, planDb, coupon, campaign } = input;

  if (coupon && coupon.reward_type !== "grant_pro_days") {
    if (!isCouponWindowOpen(coupon)) {
      return {
        amountDueUsd: listAmountUsd,
        discountUsd: 0,
        label: "Cupón fuera de vigencia",
      };
    }
    if (
      coupon.max_redemptions != null &&
      coupon.redemption_count >= coupon.max_redemptions
    ) {
      return {
        amountDueUsd: listAmountUsd,
        discountUsd: 0,
        label: "Cupón agotado",
      };
    }

    const applied = applyDiscountToAmount(listAmountUsd, {
      percent: coupon.discount_percent,
      fixedUsd: coupon.discount_usd,
    });
    return {
      ...applied,
      couponCode: coupon.code,
      label:
        coupon.reward_type === "percent_discount"
          ? `${coupon.code}: -${coupon.discount_percent}%`
          : `${coupon.code}: -$${coupon.discount_usd}`,
    };
  }

  if (campaign && isCampaignActiveNow(campaign) && campaignAppliesToPlan(campaign, planDb)) {
    const applied = applyDiscountToAmount(listAmountUsd, {
      percent: campaign.discount_percent,
      fixedUsd: campaign.discount_usd,
    });
    return {
      ...applied,
      campaignId: campaign.id,
      label: `Campaña ${campaign.name}`,
    };
  }

  return {
    amountDueUsd: listAmountUsd,
    discountUsd: 0,
    label: "Sin descuento",
  };
}

/** Marca redención de cupón de descuento (idempotente por usuario+cupón). */
export async function recordCouponRedemption(input: {
  couponId: string;
  userId: string;
  rewardSnapshot: string;
  manualPaymentId?: string | null;
}): Promise<{ error?: string }> {
  const admin = createAdminClient();

  const { error } = await admin.from("subscription_coupon_redemptions").insert({
    coupon_id: input.couponId,
    user_id: input.userId,
    reward_snapshot: input.rewardSnapshot,
    manual_payment_id: input.manualPaymentId ?? null,
  });

  if (error) {
    if (error.message.toLowerCase().includes("duplicate")) {
      return { error: "Ya usaste este cupón." };
    }
    return { error: error.message };
  }

  const { data: coupon } = await admin
    .from("subscription_coupons")
    .select("redemption_count")
    .eq("id", input.couponId)
    .maybeSingle();

  await admin
    .from("subscription_coupons")
    .update({
      redemption_count: (coupon?.redemption_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.couponId);

  return {};
}

/** Canjea cupón de días Pro sin pago. */
export async function redeemGrantProCouponForUser(input: {
  userId: string;
  code: string;
}): Promise<{ error?: string; success?: boolean; days?: number }> {
  const coupon = await findSubscriptionCouponByCode(input.code);
  if (!coupon || !coupon.is_active) {
    return { error: "Cupón no válido." };
  }
  if (coupon.reward_type !== "grant_pro_days" || !coupon.grant_pro_days) {
    return {
      error:
        "Este cupón es de descuento. Úsalo al reportar el pago en el checkout.",
    };
  }
  if (!isCouponWindowOpen(coupon)) {
    return { error: "Este cupón no está vigente." };
  }
  if (
    coupon.max_redemptions != null &&
    coupon.redemption_count >= coupon.max_redemptions
  ) {
    return { error: "Este cupón ya alcanzó el máximo de usos." };
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("subscription_coupon_redemptions")
    .select("id")
    .eq("coupon_id", coupon.id)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (existing) {
    return { error: "Ya canjeaste este cupón." };
  }

  const days = coupon.grant_pro_days;
  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime());
  endsAt.setUTCDate(endsAt.getUTCDate() + days);

  const { error: updateError } = await admin
    .from("profiles")
    .update(
      buildPaidProfilePatch("PRO", "active", {
        billingPeriod: "monthly",
        periodStartedAt: startedAt,
        periodEndsAt: endsAt,
      }),
    )
    .eq("id", input.userId);

  if (updateError) return { error: updateError.message };

  const redeem = await recordCouponRedemption({
    couponId: coupon.id,
    userId: input.userId,
    rewardSnapshot: `grant_pro_days:${days}`,
  });
  if (redeem.error) return { error: redeem.error };

  revalidatePath("/activar");
  revalidatePath("/dashboard/planes");
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/admin/dashboard");

  return { success: true, days };
}

export async function getOpenPromoOffersForUser(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_promo_offers")
    .select("id, title, message, coupon_id, created_at")
    .eq("user_id", userId)
    .is("dismissed_at", null)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) return [];
  return data ?? [];
}
