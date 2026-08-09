export const MARKETING_SUGGESTION_TYPES = [
  "create_percent_coupon",
  "create_fixed_coupon",
  "create_customer_promo",
  "combo_bundle",
] as const;

export type MarketingSuggestionType =
  (typeof MARKETING_SUGGESTION_TYPES)[number];

export type MarketingSuggestionStatus =
  | "pending"
  | "applied"
  | "dismissed"
  | "expired";

export interface PercentCouponPayload {
  code: string;
  discountPercent: number;
  maxUses: number;
  daysValid: number;
  isGlobal: boolean;
  productIds?: string[];
}

export interface FixedCouponPayload {
  code: string;
  discountFixedUsd: number;
  maxUses: number;
  daysValid: number;
  isGlobal: boolean;
  productIds?: string[];
}

export interface CustomerPromoPayload {
  name: string;
  code: string;
  discountPercentage: number;
  daysValid: number;
  autoApply: boolean;
  maxUses: number;
}

export interface ComboBundlePayload {
  code: string;
  discountPercent: number;
  maxUses: number;
  daysValid: number;
  productIds: string[];
  productNames?: string[];
}

export type MarketingSuggestionPayload =
  | PercentCouponPayload
  | FixedCouponPayload
  | CustomerPromoPayload
  | ComboBundlePayload;

export interface MarketingAiSuggestionRow {
  id: string;
  store_id: string;
  status: MarketingSuggestionStatus;
  suggestion_type: MarketingSuggestionType;
  title: string;
  rationale: string;
  action_payload: MarketingSuggestionPayload;
  created_at: string;
  updated_at: string;
  applied_at: string | null;
  dismissed_at: string | null;
}

export interface MarketingAiContext {
  storeName: string;
  storeRubro: string | null;
  generatedAt: string;
  sales: {
    todayUsd: number;
    monthToDateUsd: number;
    pendingOrders: number;
    averageOrderUsd: number;
    topProducts: Array<{ name: string; unitsSold: number }>;
  };
  inventory: {
    slowMoving: Array<{
      name: string;
      productId?: string;
      availableStock: number;
      priceUsd: number | null;
      unitsSoldThisMonth: number;
    }>;
    excessStock: Array<{
      name: string;
      productId?: string;
      availableStock: number;
      priceUsd: number | null;
      unitsSoldThisMonth: number;
    }>;
  };
  customers: {
    registeredCount: number;
    onePurchaseCount: number;
    repeatPurchaseCount: number;
  };
  promotions: {
    activeCoupons: Array<{
      code: string;
      discountLabel: string;
      useCount: number;
      maxUses: number;
    }>;
    activeCustomerPromos: Array<{
      code: string;
      name: string;
      discountPercent: number;
      useCount: number;
    }>;
  };
  comboOpportunityCategories: string[];
}

export const MAX_MARKETING_SUGGESTIONS_PER_STORE = 4;
