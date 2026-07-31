export const STAGNANT_SOFT_DAYS = 30;
export const STAGNANT_HARD_DAYS = 45;

/** Máximo de sugerencias nuevas por tienda en cada corrida. */
export const MAX_SUGGESTIONS_PER_STORE = 5;

export type InventorySuggestionType =
  | "discount_offer"
  | "feature"
  | "review_price";

export type InventorySuggestionStatus =
  | "pending"
  | "applied"
  | "dismissed"
  | "expired";

export interface DiscountOfferPayload {
  discountPercent: number;
  currentPriceUsd: number;
  suggestedPriceUsd: number;
  compareAtUsd: number;
}

export interface FeaturePayload {
  setFeatured: true;
}

export interface ReviewPricePayload {
  discountPercent: number;
  currentPriceUsd: number;
  suggestedPriceUsd: number;
  compareAtUsd: number;
}

export type InventorySuggestionPayload =
  | DiscountOfferPayload
  | FeaturePayload
  | ReviewPricePayload;

export interface InventoryAiSuggestionRow {
  id: string;
  store_id: string;
  product_id: string;
  status: InventorySuggestionStatus;
  days_without_sale: number;
  available_stock: number;
  current_price_usd: number | null;
  suggestion_type: InventorySuggestionType;
  title: string;
  rationale: string;
  action_payload: InventorySuggestionPayload;
  created_at: string;
  updated_at: string;
  applied_at: string | null;
  dismissed_at: string | null;
}

export interface StagnantProductCandidate {
  productId: string;
  productName: string;
  availableStock: number;
  priceUsd: number | null;
  daysWithoutSale: number;
  lastSaleAt: string | null;
  createdAt: string;
  isFeatured: boolean;
  thumbUrl: string | null;
}
