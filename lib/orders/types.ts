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
  /** Unidades base de inventario (p. ej. 2 cajas × 12 = 24). */
  stock_units?: number;
  /** Variante que concentra el stock cuando hay venta por empaque. */
  inventory_variant_id?: string;
  /** Detal o mayorista según cantidad al momento del pedido. */
  pricing_tier?: "retail" | "wholesale";
  /** Precio unitario de detal de referencia cuando aplica mayorista. */
  retail_unit_price_usd?: number;
  /**
   * Costo mayorista congelado al emitir el pedido (dropshipping).
   * Las órdenes posteriores usan el costo vigente; las emitidas conservan este valor.
   */
  unit_cost_usd?: number;
  /** SKU del proveedor vinculado al momento del pedido. */
  supplier_product_id?: string | null;
  /** Momento en que se congeló el costo. */
  cost_locked_at?: string;
  /** Línea de tarjeta de regalo digital (sin dropship). */
  is_gift_card?: boolean;
  /** Códigos emitidos al confirmar la compra (uno por unidad). */
  issued_gift_card_codes?: string[];
  /** Dedicatoria opcional del comprador (producto digital). */
  gift_dedication?: string;
}

export interface CatalogOrder {
  id: string;
  store_id: string;
  customer_name: string;
  customer_phone: string | null;
  /** Si hay user id, el cliente compró (o quedó vinculado) con cuenta en la tienda. */
  customer_user_id?: string | null;
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
  /** Número de guía de encomienda (opcional). */
  tracking_number?: string | null;
}

export interface SubmitOrderLineInput {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPriceUsd: number;
  wholesaleApplied?: boolean;
  /** Extra de modificadores (alimentos, etc.); el servidor lo suma al precio. */
  modifiersExtraUsd?: number;
  /** Mensaje/dedicatoria opcional al comprar una tarjeta de regalo. */
  giftDedication?: string;
}
