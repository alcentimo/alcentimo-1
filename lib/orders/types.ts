import type { OrderEstado } from "@/lib/orders/order-status";

export type { OrderEstado };

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
  customer_phone: string | null;
  items: OrderLineItem[];
  total_usd: number;
  payment_proof_url: string | null;
  estado: OrderEstado;
  created_at: string;
  location_id?: string | null;
  location_name?: string | null;
  fulfillment_type?: "delivery" | "pickup" | "shipping" | null;
  shipping_method?: string | null;
  shipping_branch_code?: string | null;
  shipping_branch_name?: string | null;
  shipping_branch_address?: string | null;
  delivery_address?: string | null;
}

export interface SubmitOrderLineInput {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPriceUsd: number;
}
