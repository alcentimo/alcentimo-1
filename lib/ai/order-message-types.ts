import type { OrderEstado } from "@/lib/orders/order-status";

export type OrderWhatsAppMessageIntent = "general" | "status_update";

export interface GenerateOrderWhatsAppMessageInput {
  customerName: string;
  storeName: string;
  orderReference: string;
  totalUsd: number;
  productsSummary: string;
  currentEstado: OrderEstado;
  newEstado?: OrderEstado;
  intent: OrderWhatsAppMessageIntent;
}

export interface GenerateOrderWhatsAppMessageResult {
  message: string;
}
