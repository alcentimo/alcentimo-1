import type { CartItem } from "@/lib/catalog/cart-types";
import type { AppliedCoupon, CouponDiscountType } from "@/lib/coupons/types";

export interface CouponDiscountBreakdown {
  discountUsd: number;
  discountVes: number;
  eligibleSubtotalUsd: number;
  eligibleSubtotalVes: number;
  eligibleProductIds: string[];
}

export function getEligibleCartProductIds(
  cartProductIds: string[],
  isGlobal: boolean,
  productIds: string[],
): string[] {
  const uniqueCartIds = [...new Set(cartProductIds)];
  if (isGlobal) return uniqueCartIds;
  const allowed = new Set(productIds);
  return uniqueCartIds.filter((id) => allowed.has(id));
}

export function isCartItemEligible(
  productId: string,
  coupon: Pick<AppliedCoupon, "isGlobal" | "eligibleProductIds">,
): boolean {
  return coupon.isGlobal || coupon.eligibleProductIds.includes(productId);
}

export function calculateCartCouponDiscount(
  items: CartItem[],
  coupon: AppliedCoupon,
): CouponDiscountBreakdown {
  const eligibleItems = items.filter((item) =>
    isCartItemEligible(item.product.product_id, coupon),
  );

  const eligibleSubtotalUsd = eligibleItems.reduce(
    (sum, item) => sum + item.unitPriceUsd * item.quantity,
    0,
  );
  const eligibleSubtotalVes = eligibleItems.reduce(
    (sum, item) => sum + (item.unitPriceVes ?? 0) * item.quantity,
    0,
  );

  let discountUsd = 0;
  if (coupon.discountType === "percent") {
    discountUsd = eligibleSubtotalUsd * ((coupon.discountPercent ?? 0) / 100);
  } else {
    discountUsd = Math.min(coupon.discountFixedUsd ?? 0, eligibleSubtotalUsd);
  }

  const discountVes =
    eligibleSubtotalUsd > 0
      ? eligibleSubtotalVes * (discountUsd / eligibleSubtotalUsd)
      : 0;

  return {
    discountUsd,
    discountVes,
    eligibleSubtotalUsd,
    eligibleSubtotalVes,
    eligibleProductIds: coupon.eligibleProductIds,
  };
}

export function formatCouponDiscountLabel(coupon: {
  discount_type: CouponDiscountType;
  discount_percent: number | null;
  discount_fixed_usd: number | null;
}): string {
  if (coupon.discount_type === "fixed") {
    return `$${Number(coupon.discount_fixed_usd ?? 0).toFixed(2)} USD`;
  }
  return `${Number(coupon.discount_percent ?? 0)}%`;
}

export function formatCouponScopeLabel(coupon: {
  is_global: boolean;
  product_ids: string[];
}): string {
  if (coupon.is_global) return "Toda la tienda";
  const count = coupon.product_ids.length;
  return count === 1 ? "1 producto" : `${count} productos`;
}
