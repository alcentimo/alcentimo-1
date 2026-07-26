import type {
  SubscriptionCampaign,
  SubscriptionCoupon,
} from "@/lib/database.types";

export function formatSubscriptionCouponReward(
  coupon: SubscriptionCoupon,
): string {
  if (coupon.reward_type === "percent_discount") {
    return `${coupon.discount_percent}% de descuento`;
  }
  if (coupon.reward_type === "fixed_discount") {
    return `$${coupon.discount_usd} USD de descuento`;
  }
  return `${coupon.grant_pro_days} días Pro gratis`;
}

export function formatSubscriptionCampaignReward(
  campaign: SubscriptionCampaign,
): string {
  if (campaign.discount_percent != null) {
    return `${campaign.discount_percent}% de descuento automático`;
  }
  if (campaign.discount_usd != null) {
    return `$${campaign.discount_usd} USD de descuento automático`;
  }
  return "Descuento automático";
}

export function formatAdminPromoDate(iso: string | null | undefined): string {
  if (!iso) return "Sin fecha";
  return new Intl.DateTimeFormat("es-VE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function isSubscriptionCouponExpired(
  coupon: SubscriptionCoupon,
  now = Date.now(),
): boolean {
  if (!coupon.ends_at) return false;
  return new Date(coupon.ends_at).getTime() < now;
}
