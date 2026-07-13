export type OrderStatus = "pending" | "confirmed" | "cancelled";

export interface OrderLineItem {
  product_id: string;
  variant_id: string;
  product_name: string;
  variant_name: string;
  quantity: number;
  unit_price_usd: number;
  line_total_usd: number;
}

export interface CatalogOrder {
  id: string;
  store_id: string;
  customer_name: string;
  items: OrderLineItem[];
  total_usd: number;
  payment_proof_url: string | null;
  status: OrderStatus;
  created_at: string;
}

export interface SubmitOrderLineInput {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPriceUsd: number;
}
