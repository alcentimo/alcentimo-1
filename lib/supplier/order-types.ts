import { NATIONAL_CARRIER_METHODS } from "@/src/config/shipping-methods";
import type { SupplierOrderPaymentStatus } from "@/lib/supplier/payment-types";

export const SUPPLIER_ORDER_STATUSES = [
  "pendiente",
  "preparando",
  "despachado",
] as const;

export type SupplierOrderStatus = (typeof SUPPLIER_ORDER_STATUSES)[number];

export const SUPPLIER_ORDER_STATUS_LABELS: Record<SupplierOrderStatus, string> =
  {
    pendiente: "Apartar stock",
    preparando: "Listo para recolección",
    despachado: "Recolectado por Alcéntimo",
  };

export function isSupplierOrderStatus(
  value: unknown,
): value is SupplierOrderStatus {
  return (
    value === "pendiente" ||
    value === "preparando" ||
    value === "despachado"
  );
}

export const SUPPLIER_SHIPPING_CARRIER_OPTIONS = [
  { value: "acopio_alcentimo", label: "Recolección Alcéntimo" },
  ...NATIONAL_CARRIER_METHODS.map((method) => ({
    value: method.key,
    label: method.label,
  })),
  { value: "otro", label: "Otra agencia / coordinado" },
] as const;

export function supplierCarrierLabel(value: string | null | undefined): string {
  if (!value?.trim()) return "Sin agencia";
  const found = SUPPLIER_SHIPPING_CARRIER_OPTIONS.find(
    (option) => option.value === value,
  );
  return found?.label ?? value;
}

export interface SupplierOrderItem {
  id: string;
  productId: string | null;
  productTitle: string;
  quantity: number;
  /** Precio cobrado al comerciante (snapshot inmutable). */
  unitPriceUsd: number;
  /** Costo mayorista congelado al emitir el pedido. */
  unitCostUsd: number;
  costLockedAt: string | null;
  lineTotalUsd: number;
}

export interface SupplierOrder {
  id: string;
  buyerName: string;
  buyerDocumentId: string | null;
  buyerPhone: string | null;
  buyerAddress: string | null;
  shippingCarrier: string | null;
  shippingBranchName: string | null;
  shippingBranchAddress: string | null;
  status: SupplierOrderStatus;
  trackingNumber: string | null;
  notes: string;
  totalUsd: number;
  createdAt: string;
  updatedAt: string;
  items: SupplierOrderItem[];
  /** Pedido del catálogo (cliente final) vinculado, si aplica. */
  sourceCatalogOrderId: string | null;
  paymentStatus: SupplierOrderPaymentStatus;
  paymentMethod: string | null;
  paymentReference: string | null;
  paymentProofUrl: string | null;
  paymentNotes: string;
  paymentNotifiedAt: string | null;
  paymentReportedAt: string | null;
  settlementId: string | null;
  /** Fecha civil America/Caracas a partir de la cual aplica el despacho D+1. */
  shipOn: string | null;
  /** Nombre de la tienda del dropshipper para la etiqueta (remitente). */
  senderName: string | null;
  dispatchNotifiedAt: string | null;
}

export interface CreateSupplierOrderItemInput {
  productId: string;
  quantity: number;
}
