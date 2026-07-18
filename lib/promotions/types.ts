export interface Promotion {
  id: string;
  store_id: string;
  name: string;
  discount_percentage: number;
  code: string;
  start_date: string | null;
  end_date: string;
  is_active: boolean;
  auto_apply: boolean;
  max_uses: number;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export interface AppliedPromotion {
  code: string;
  name: string;
  discountPercent: number;
}

export interface CatalogPromotionContext {
  /** Banner para invitados cuando hay promoción activa. */
  guestBanner: {
    name: string;
    discountPercent: number;
    registerPath: string;
  } | null;
  /** Promoción auto-aplicable para clientes registrados. */
  autoApply: AppliedPromotion | null;
}
