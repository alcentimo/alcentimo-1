"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { SupplierPayoutProofPreview } from "@/components/supplier/SupplierPayoutProofPreview";
import { formatBusinessDateEs } from "@/lib/dropship/settlement-date";
import {
  SUPPLIER_PAYOUT_STATUS_LABELS,
  type SupplierPayoutObligationView,
} from "@/lib/dropship/settlement-types";
import { formatUsd } from "@/lib/format";
import { isSupplierB2bPaymentMethodKey } from "@/lib/supplier/payment-types";
import {
  SUPPLIER_ORDER_STATUS_LABELS,
  supplierOrderDispatchUnlocked,
  type SupplierOrder,
  type SupplierOrderStatus,
} from "@/lib/supplier/order-types";
import { getPaymentMethod } from "@/src/config/payment-methods";
import { cn } from "@/lib/cn";

function paymentHeadline(
  order: SupplierOrder,
  payout: SupplierPayoutObligationView | null,
): { label: string; paid: boolean } {
  if (payout) {
    return {
      label: SUPPLIER_PAYOUT_STATUS_LABELS[payout.status],
      paid: payout.status === "paid",
    };
  }
  if (order.paymentStatus === "confirmado") {
    return { label: "Pagado", paid: true };
  }
  if (order.paymentStatus === "reportado") {
    return { label: "Confirmado", paid: false };
  }
  return { label: "Pendiente", paid: false };
}

function logisticsBadgeClass(status: SupplierOrderStatus): string {
  switch (status) {
    case "preparando":
      return "supplier-hub-status-preparando";
    case "despachado":
      return "supplier-hub-status-despachado";
    default:
      return "supplier-hub-status-pendiente";
  }
}

function shortOrderId(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

interface SupplierIncomingPayoutCardProps {
  order: SupplierOrder;
  payout?: SupplierPayoutObligationView | null;
  saving?: boolean;
  onStatusChange?: (order: SupplierOrder, status: SupplierOrderStatus) => void;
}

export function SupplierIncomingPayoutCard({
  order,
  payout = null,
  saving = false,
  onStatusChange,
}: SupplierIncomingPayoutCardProps) {
  const dispatchUnlocked = supplierOrderDispatchUnlocked(order);
  const payment = paymentHeadline(order, payout);
  const proofUrl = payout?.paymentProofUrl ?? order.paymentProofUrl;
  const methodRaw = payout?.paymentMethod ?? order.paymentMethod;
  const methodLabel = methodRaw
    ? isSupplierB2bPaymentMethodKey(methodRaw)
      ? (getPaymentMethod(methodRaw).label ?? methodRaw)
      : methodRaw
    : null;
  const reference = payout?.paymentReference ?? order.paymentReference;
  const purchaseDate = useMemo(() => {
    const created = order.createdAt.slice(0, 10);
    return created ? formatBusinessDateEs(created) : "";
  }, [order.createdAt]);

  return (
    <article className="supplier-hub-order-card">
      <header className="supplier-hub-order-card-header">
        <div className="min-w-0">
          <p className="supplier-hub-order-id">#{shortOrderId(order.id)}</p>
          {purchaseDate ? (
            <p className="supplier-hub-order-date">{purchaseDate}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                logisticsBadgeClass(order.status),
              )}
            >
              {SUPPLIER_ORDER_STATUS_LABELS[order.status]}
            </span>
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                payment.paid
                  ? "supplier-hub-status-paid"
                  : "supplier-hub-status-pendiente",
              )}
            >
              {payment.label}
            </span>
          </div>
        </div>
        <p className="supplier-hub-order-total">{formatUsd(order.totalUsd)}</p>
      </header>

      {order.items.length > 0 ? (
        <ul className="supplier-hub-order-items">
          {order.items.map((item) => (
            <li key={item.id} className="supplier-hub-order-item">
              <span className="min-w-0 truncate text-sm text-zinc-800 dark:text-zinc-100">
                {item.productTitle}
              </span>
              <span className="supplier-hub-order-item-qty">×{item.quantity}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {proofUrl ? (
        <div className="px-4 pb-3 sm:px-5">
          <SupplierPayoutProofPreview
            className="mt-2"
            url={proofUrl}
            label="Comprobante"
          />
          {methodLabel || reference ? (
            <p className="mt-1.5 text-xs text-zinc-500">
              {methodLabel}
              {reference ? ` · ${reference}` : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      {onStatusChange && order.status !== "despachado" ? (
        <div className="supplier-hub-order-actions">
          {order.status === "pendiente" ? (
            <button
              type="button"
              className="supplier-hub-order-action"
              disabled={saving || !dispatchUnlocked}
              onClick={() => onStatusChange(order, "preparando")}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              Marcar como preparado
            </button>
          ) : (
            <button
              type="button"
              className="supplier-hub-order-action-muted"
              disabled={saving}
              onClick={() => onStatusChange(order, "pendiente")}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              Por preparar
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}
