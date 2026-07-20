import type {
  SubscriptionCampaign,
  SubscriptionCoupon,
} from "@/lib/database.types";

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function applyDiscountToAmount(
  amountUsd: number,
  discount: { percent?: number | null; fixedUsd?: number | null },
): { amountDueUsd: number; discountUsd: number } {
  if (amountUsd <= 0) {
    return { amountDueUsd: 0, discountUsd: 0 };
  }

  let discountUsd = 0;
  if (discount.percent != null && discount.percent > 0) {
    discountUsd = (amountUsd * discount.percent) / 100;
  } else if (discount.fixedUsd != null && discount.fixedUsd > 0) {
    discountUsd = discount.fixedUsd;
  }

  discountUsd = roundMoney(Math.min(discountUsd, amountUsd));
  return {
    amountDueUsd: roundMoney(Math.max(0, amountUsd - discountUsd)),
    discountUsd,
  };
}

export function isCouponWindowOpen(
  coupon: Pick<SubscriptionCoupon, "starts_at" | "ends_at" | "is_active">,
  now = new Date(),
): boolean {
  if (!coupon.is_active) return false;
  const ms = now.getTime();
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > ms) return false;
  if (coupon.ends_at && new Date(coupon.ends_at).getTime() < ms) return false;
  return true;
}

export function isCampaignActiveNow(
  campaign: Pick<
    SubscriptionCampaign,
    "starts_at" | "ends_at" | "is_active"
  >,
  now = new Date(),
): boolean {
  if (!campaign.is_active) return false;
  const ms = now.getTime();
  return (
    new Date(campaign.starts_at).getTime() <= ms &&
    new Date(campaign.ends_at).getTime() >= ms
  );
}

export function campaignAppliesToPlan(
  campaign: Pick<SubscriptionCampaign, "applies_to_plans">,
  planDb: "PRO" | "BUSINESS",
): boolean {
  const plans = campaign.applies_to_plans ?? [];
  if (plans.length === 0) return true;
  return plans.map((p) => p.toUpperCase()).includes(planDb);
}
