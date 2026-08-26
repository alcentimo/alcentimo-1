"use client";

import { useMemo } from "react";
import { CheckCircle2, Loader2, Package, Truck } from "lucide-react";
import { SupplierPayoutProofPreview } from "@/components/supplier/SupplierPayoutProofPreview";
import { formatBusinessDateEs } from "@/lib/dropship/settlement-date";
import {
  SUPPLIER_PAYOUT_STATUS_LABELS,
  type SupplierPayoutObligationView,
} from "@/lib/dropship/settlement-types";
import { formatUsd } from "@/lib/format";
import { isSupplierB2bPaymentMethodKey } from "@/lib/supplier/payment-types";
import {
  SUPPLIER_HUB_SETTABLE_STATUSES,
  SUPPLIER_ORDER_STATUS_LABELS,
  supplierOrderDispatchUnlocked,
  type SupplierOrder,
  type SupplierOrderStatus,
} from "@/lib/supplier/order-types";
import { getPaymentMethod } from "@/src/config/payment-methods";
import { cn } from "@/lib/cn";

function payoutBadgeClass(status: SupplierPayoutObligationView["status"]): string {
  if (status === "paid") {
    return "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50";
  }
  if (status === "pending") {
    return "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/50";
  }
  return "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50";
}

function logisticsBadgeClass(status: SupplierOrderStatus): string {
  switch (status) {
    case "despachado":
      return "supplier-hub-status-despachado";
    case "preparando":
      return "supplier-hub-status-preparando";
    default:
      return "supplier-hub-status-pendiente";
  }
}

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
    return { label: "Pagado por Alcéntimo", paid: true };
  }
  if (order.paymentStatus === "reportado") {
    return { label: "Liquidación en proceso", paid: false };
  }
  return { label: "Pago pendiente", paid: false };
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
  const dateLabel = useMemo(() => {
    if (payout?.businessDate) return formatBusinessDateEs(payout.businessDate);
    if (order.shipOn) return formatBusinessDateEs(order.shipOn);
    const created = order.createdAt.slice(0, 10);
    return created ? formatBusinessDateEs(created) : "";
  }, [order.createdAt, order.shipOn, payout?.businessDate]);
  const productUnits = useMemo(
    () => order.items.reduce((sum, item) => sum + item.quantity, 0),
    [order.items],
  );

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <header className="border-b border-teal-100 bg-teal-50/90 px-4 py-4 sm:px-5 dark:border-teal-900/40 dark:bg-teal-950/30">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
            Compra de Alcéntimo{dateLabel ? ` · ${dateLabel}` : ""}
          </p>
          <span
            className={cn(
              "inline-flex w-fit rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
              payout
                ? payoutBadgeClass(payout.status)
                : payment.paid
                  ? payoutBadgeClass("paid")
                  : payoutBadgeClass("pending"),
            )}
          >
            {payment.label}
          </span>
        </div>
        <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-teal-950 dark:text-teal-50">
          {formatUsd(order.totalUsd)}
        </p>
        <p className="mt-2 text-xs text-teal-800/90 dark:text-teal-200/80">
          {order.items.length > 0
            ? `${order.items.length} producto${order.items.length === 1 ? "" : "s"} · ${productUnits} unidad${productUnits === 1 ? "" : "es"}`
            : "Pedido de compra"}
          {order.shipOn
            ? ` · retiro ${formatBusinessDateEs(order.shipOn)}`
            : ""}
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase text-teal-800/70 dark:text-teal-200/60">
          #{order.id.slice(0, 8)}
        </p>
      </header>

      <div className="space-y-4 px-4 py-4 sm:px-5">
        <p className="inline-flex w-full items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <Truck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
          <span>
            Alcéntimo retira esta mercancía en tu almacén. No entregues ni
            cobres al cliente final.
          </span>
        </p>

        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Pago de Alcéntimo
          </p>
          {payment.paid ? (
            <p className="mt-1 inline-flex items-start gap-2 text-sm text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Pago registrado. Ya puedes marcar el pedido listo para retirar
                {order.shipOn
                  ? ` a partir del ${formatBusinessDateEs(order.shipOn)}`
                  : ""}
                .
              </span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
              Aparta el stock. El retiro se habilita cuando Alcéntimo registre
              el pago (el comprobante aparece aquí).
            </p>
          )}
          {proofUrl ? (
            <>
              <SupplierPayoutProofPreview
                className="mt-2"
                url={proofUrl}
                label="Ver comprobante"
              />
              <p className="mt-2 text-xs text-zinc-500">
                {methodLabel ? methodLabel : "Pago"}
                {reference ? ` · Ref. ${reference}` : ""}
              </p>
            </>
          ) : payment.paid ? (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Pagado, pero aún no hay comprobante visible. Si falta, contacta a
              Alcéntimo.
            </p>
          ) : (
            <p className="mt-1 text-xs text-zinc-500">
              El comprobante aparecerá aquí cuando Alcéntimo liquide y lo
              cargue.
            </p>
          )}
        </div>

        {order.items.length > 0 ? (
          <div>
            <div className="flex items-start gap-2">
              <Package
                className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Mercancía a preparar
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Lo que Alcéntimo te compra en este pedido.
                </p>
                <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
                  {order.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {item.productTitle}
                        </span>
                        <span className="text-xs tabular-nums text-zinc-500">
                          ×{item.quantity}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                        {formatUsd(item.lineTotalUsd)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}

        <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Estado logístico
            </p>
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                logisticsBadgeClass(order.status),
              )}
            >
              {SUPPLIER_ORDER_STATUS_LABELS[order.status]}
            </span>
          </div>
          {onStatusChange ? (
            <div className="mt-2 flex items-center gap-2">
              <select
                className="input-field !mt-0 min-w-[14rem] !py-2 text-xs"
                value={order.status}
                disabled={
                  saving ||
                  order.status === "despachado" ||
                  !dispatchUnlocked
                }
                aria-label={`Estado logístico del pedido ${order.id.slice(0, 8)}`}
                onChange={(event) =>
                  onStatusChange(
                    order,
                    event.target.value as SupplierOrderStatus,
                  )
                }
              >
                {order.status === "despachado" ? (
                  <option value="despachado">
                    {SUPPLIER_ORDER_STATUS_LABELS.despachado}
                  </option>
                ) : (
                  SUPPLIER_HUB_SETTABLE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {SUPPLIER_ORDER_STATUS_LABELS[status]}
                    </option>
                  ))
                )}
              </select>
              {saving ? (
                <Loader2
                  className="h-4 w-4 shrink-0 animate-spin text-zinc-400"
                  aria-hidden="true"
                />
              ) : null}
            </div>
          ) : null}
          {!dispatchUnlocked && order.status !== "despachado" ? (
            <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-300">
              Esperando el pago registrado de Alcéntimo para habilitar el
              retiro.
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
