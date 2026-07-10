export type CouponDiscountType = "percent" | "fixed";

export interface Coupon {
  id: string;
  store_id: string;
  code: string;
  discount_type: CouponDiscountType;
  discount_percent: number | null;
  discount_fixed_usd: number | null;
  is_active: boolean;
  is_global: boolean;
  product_ids: string[];
  max_uses: number;
  use_count: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppliedCoupon {
  code: string;
  discountType: CouponDiscountType;
  discountPercent: number | null;
  discountFixedUsd: number | null;
  isGlobal: boolean;
  productIds: string[];
  eligibleProductIds: string[];
}
