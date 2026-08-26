import type { SupplierB2bPaymentMethodKey } from "@/lib/supplier/payment-types";

export const DROPSHIP_SETTLEMENT_STATUSES = [
  "reported",
  "approved",
  "rejected",
] as const;

export type DropshipSettlementStatus =
  (typeof DROPSHIP_SETTLEMENT_STATUSES)[number];

export const DROPSHIP_SETTLEMENT_STATUS_LABELS: Record<
  DropshipSettlementStatus,
  string
> = {
  reported: "Pago reportado",
  approved: "Aprobado",
  rejected: "Rechazado",
};

export function isDropshipSettlementStatus(
  value: unknown,
): value is DropshipSettlementStatus {
  return (
    value === "reported" || value === "approved" || value === "rejected"
  );
}

export const SUPPLIER_PAYOUT_STATUSES = [
  "pending",
  "scheduled",
  "paid",
] as const;

export type SupplierPayoutStatus = (typeof SUPPLIER_PAYOUT_STATUSES)[number];

export const SUPPLIER_PAYOUT_STATUS_LABELS: Record<SupplierPayoutStatus, string> =
  {
    pending: "Pendiente",
    scheduled: "Programado D+1",
    paid: "Pagado",
  };

export function isSupplierPayoutStatus(
  value: unknown,
): value is SupplierPayoutStatus {
  return value === "pending" || value === "scheduled" || value === "paid";
}

/** Pedidos del catálogo cuyo cobro al cliente ya está confirmado. */
export const SETTLEMENT_ELIGIBLE_ORDER_ESTADOS = [
  "procesando",
  "preparacion_logistica",
  "enviado",
  "entregado",
] as const;

export type SettlementEligibleOrderEstado =
  (typeof SETTLEMENT_ELIGIBLE_ORDER_ESTADOS)[number];

export function isSettlementEligibleOrderEstado(
  value: unknown,
): value is SettlementEligibleOrderEstado {
  return (
    value === "procesando" ||
    value === "preparacion_logistica" ||
    value === "enviado" ||
    value === "entregado"
  );
}

export interface DropshipSettlementShippingView {
  customerName: string;
  customerDocumentId: string | null;
  customerPhone: string | null;
  fulfillmentType: string | null;
  shippingMethod: string | null;
  shippingMethodLabel: string | null;
  shippingBranchName: string | null;
  shippingBranchAddress: string | null;
  deliveryAddress: string | null;
  fulfillmentLabel: string | null;
  destinationLabel: string;
}

export interface DropshipSettlementLineView {
  catalogOrderId: string;
  supplierUserId: string;
  supplierName?: string | null;
  supplierProductId: string | null;
  productTitle: string;
  quantity: number;
  unitCostUsd: number;
  platformMarkupUsd: number;
  lineDueUsd: number;
  supplierPayoutUsd: number;
  shipping: DropshipSettlementShippingView | null;
}

export interface DropshipSettlementShipmentProduct {
  title: string;
  quantity: number;
  supplierUserId: string;
  supplierName: string | null;
}

export interface DropshipSettlementShipmentView {
  catalogOrderId: string;
  productTitles: string[];
  products: DropshipSettlementShipmentProduct[];
  quantity: number;
  lineDueUsd: number;
  shipping: DropshipSettlementShippingView | null;
}

export interface DropshipSettlementSupplierBreakdown {
  supplierUserId: string;
  supplierName: string | null;
  wholesaleCostUsd: number;
  lineCount: number;
  orderCount: number;
}

export interface DropshipDailySettlementSummary {
  businessDate: string;
  storeId: string;
  storeName: string;
  markupPercent: number;
  orderCount: number;
  lineCount: number;
  wholesaleCostUsd: number;
  platformMarkupUsd: number;
  amountDueUsd: number;
  lines: DropshipSettlementLineView[];
  suppliers: DropshipSettlementSupplierBreakdown[];
  existing: DropshipSettlementRecord | null;
}

export type SettlementLedgerPartyKind = "platform" | "supplier";

export interface SettlementBalanceEntryView {
  id: string;
  settlementId: string;
  accountKey: string;
  partyKind: SettlementLedgerPartyKind;
  partyUserId: string | null;
  partyName: string | null;
  amountUsd: number;
  description: string;
  createdAt: string;
}

export interface DropshipSettlementRecord {
  id: string;
  storeId: string;
  storeName: string;
  merchantUserId: string;
  merchantEmail: string | null;
  businessDate: string;
  orderCount: number;
  wholesaleCostUsd: number;
  platformMarkupUsd: number;
  markupPercent: number;
  amountDueUsd: number;
  status: DropshipSettlementStatus;
  paymentMethod: SupplierB2bPaymentMethodKey | string | null;
  paymentReference: string | null;
  paymentProofUrl: string | null;
  paymentNotes: string;
  reportedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNotes: string;
  payouts: SupplierPayoutObligationView[];
  ledger: SettlementBalanceEntryView[];
  shipments: DropshipSettlementShipmentView[];
  suppliers: DropshipSettlementSupplierBreakdown[];
}

/** Línea consolidada visible al proveedor: lo que Alcéntimo le compra. */
export interface SupplierPayoutProductLine {
  title: string;
  quantity: number;
  amountUsd: number;
}

export interface SupplierPayoutObligationView {
  id: string;
  settlementId: string;
  supplierUserId: string;
  supplierName: string | null;
  businessDate: string;
  shipOn: string;
  amountUsd: number;
  orderCount: number;
  lineCount: number;
  status: SupplierPayoutStatus;
  paymentProofUrl: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  paidAt: string | null;
  /** Pedidos de cliente: solo para admin / dropshipper. Vacío en el panel del proveedor. */
  shipments: DropshipSettlementShipmentView[];
  /** Productos consolidados que Alcéntimo paga al proveedor. */
  products: SupplierPayoutProductLine[];
}

export const DROPSHIP_CENTRAL_PAYMENT_NOTICE =
  "Liquida a Alcéntimo el consolidado del día con un solo pago. El proveedor aparta el stock y espera la recolección; no ve el pago del cliente final.";

/** Texto del panel del proveedor: Alcéntimo paga; el proveedor no cobra a nadie. */
export const SUPPLIER_ALCENTIMO_PAYOUT_NOTICE =
  "Tú no cobras al cliente final ni al dropshipper. Alcéntimo te compra los productos, te paga aquí y se encarga de retirar la mercancía para despacharla.";
