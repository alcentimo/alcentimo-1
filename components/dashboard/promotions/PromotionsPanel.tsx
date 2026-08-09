"use client";

import { PromotionsTab } from "@/components/dashboard/settings/PromotionsTab";
import { MarketingAiSuggestionCards } from "@/components/dashboard/promotions/MarketingAiSuggestionCards";
import type { CouponProductOption } from "@/components/dashboard/settings/CouponProductPicker";
import type { Coupon } from "@/lib/coupons/types";
import type { Promotion } from "@/lib/promotions/types";
import type { MarketingAiSuggestionRow } from "@/lib/marketing-ai/types";

interface PromotionsPanelProps {
  initialCoupons: Coupon[];
  initialPromotions: Promotion[];
  products: CouponProductOption[];
  initialAiSuggestions: MarketingAiSuggestionRow[];
}

export function PromotionsPanel({
  initialCoupons,
  initialPromotions,
  products,
  initialAiSuggestions,
}: PromotionsPanelProps) {
  return (
    <div className="space-y-6">
      <MarketingAiSuggestionCards
        initialSuggestions={initialAiSuggestions}
        variant="full"
      />
      <PromotionsTab
        initialCoupons={initialCoupons}
        initialPromotions={initialPromotions}
        products={products}
      />
    </div>
  );
}
