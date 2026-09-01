export type GiftCardStatus = "active" | "disabled" | "depleted";

export interface GiftCard {
  id: string;
  store_id: string;
  code: string;
  initial_balance_usd: number;
  current_balance_usd: number;
  status: GiftCardStatus;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GiftCardRedemption {
  id: string;
  gift_card_id: string;
  store_id: string;
  order_id: string | null;
  amount_usd: number;
  user_id?: string | null;
  kind?: "order" | "wallet";
  created_at: string;
}

export interface CustomerStoreCredit {
  id: string;
  store_id: string;
  user_id: string;
  balance_usd: number;
  created_at: string;
  updated_at: string;
}

export interface AppliedGiftCard {
  code: string;
  currentBalanceUsd: number;
}

export const GIFT_CARD_STORE_DENIED_MESSAGE =
  "Las tarjetas de regalo solo están disponibles en la tienda de Alcéntimo.";
