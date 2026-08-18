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
  supplierProductId: string | null;
  productTitle: string;
  quantity: number;
  unitCostUsd: number;
  platformMarkupUsd: number;
  lineDueUsd: number;
  supplierPayoutUsd: number;
  shipping: DropshipSettlementShippingView | null;
}

export interface DropshipSettlementShipmentView {
  catalogOrderId: string;
  productTitles: string[];
  quantity: number;
  lineDueUsd: number;
  shipping: DropshipSettlementShippingView | null;
}

export interface DropshipSettlementSupplierBreakdown {
  supplierUserId: string;
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
}

export interface SupplierPayoutObligationView {
  id: string;
  settlementId: string;
  supplierUserId: string;
  businessDate: string;
  shipOn: string;
  amountUsd: number;
  orderCount: number;
  lineCount: number;
  status: SupplierPayoutStatus;
}

export const DROPSHIP_CENTRAL_PAYMENT_NOTICE =
  "El dropshipper liquida a Alcéntimo el costo mayorista. El proveedor solo aparta el stock y espera la recolección de Alcéntimo; no ve el pago del cliente final.";
