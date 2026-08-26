"use client";

import { useMemo } from "react";
import { CheckCircle2 } from "lucide-react";
import { SettlementCustomerShipments } from "@/components/dropship/SettlementCustomerShipments";
import { SupplierPayoutProofPreview } from "@/components/supplier/SupplierPayoutProofPreview";
import { formatBusinessDateEs } from "@/lib/dropship/settlement-date";
import {
  SUPPLIER_PAYOUT_STATUS_LABELS,
  type SupplierPayoutObligationView,
} from "@/lib/dropship/settlement-types";
import { formatUsd } from "@/lib/format";
import { getPaymentMethod } from "@/src/config/payment-methods";
import { cn } from "@/lib/cn";

function statusClass(status: SupplierPayoutObligationView["status"]): string {
  if (status === "paid") {
    return "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50";
  }
  if (status === "pending") {
    return "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/50";
  }
  return "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50";
}

interface SupplierIncomingPayoutCardProps {
  payout: SupplierPayoutObligationView;
}

export function SupplierIncomingPayoutCard({
  payout,
}: SupplierIncomingPayoutCardProps) {
  const isPaid = payout.status === "paid";
  const dateLabel = useMemo(
    () => formatBusinessDateEs(payout.businessDate),
    [payout.businessDate],
  );
  const methodLabel = payout.paymentMethod
    ? (getPaymentMethod(payout.paymentMethod)?.label ?? payout.paymentMethod)
    : null;

  return (
    <section className="space-y-3">
      {isPaid ? (
        <p className="inline-flex w-full items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2.5 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Pago registrado por Alcéntimo. Ya puedes marcar los pedidos listos
            para recolección
            {payout.shipOn
              ? ` a partir del ${formatBusinessDateEs(payout.shipOn)}`
              : ""}
            .
          </span>
        </p>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          Aparta el stock. El despacho se habilita cuando Alcéntimo registre
          este pago (capture visible aquí).
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-teal-100 bg-teal-50/90 px-4 py-4 sm:px-5 dark:border-teal-900/40 dark:bg-teal-950/30">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
              Total a cobrar · {dateLabel}
            </p>
            <span
              className={cn(
                "inline-flex w-fit rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                statusClass(payout.status),
              )}
            >
              {SUPPLIER_PAYOUT_STATUS_LABELS[payout.status]}
            </span>
          </div>
          <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-teal-950 dark:text-teal-50">
            {formatUsd(payout.amountUsd)}
          </p>
          <p className="mt-2 text-xs text-teal-800/90 dark:text-teal-200/80">
            {payout.orderCount} pedido{payout.orderCount === 1 ? "" : "s"} ·{" "}
            {payout.lineCount} producto{payout.lineCount === 1 ? "" : "s"}
            {payout.shipOn
              ? ` · recolección ${formatBusinessDateEs(payout.shipOn)}`
              : ""}
          </p>
        </div>

        <div className="space-y-3 px-4 py-4 sm:px-5">
          {payout.paymentProofUrl ? (
            <>
              <SupplierPayoutProofPreview url={payout.paymentProofUrl} />
              <p className="text-xs text-zinc-500">
                {methodLabel ? `${methodLabel}` : "Pago"}
                {payout.paymentReference
                  ? ` · Ref. ${payout.paymentReference}`
                  : ""}
              </p>
            </>
          ) : isPaid ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Pagado, pero aún no hay capture visible. Si falta, contacta a
              Alcéntimo.
            </p>
          ) : (
            <p className="text-xs text-zinc-500">
              El capture del pago aparecerá aquí cuando Alcéntimo liquide y lo
              cargue. Hasta entonces no puedes marcar listo para recolección.
            </p>
          )}
        </div>
      </div>

      {payout.shipments.length > 0 ? (
        <SettlementCustomerShipments
          className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
          shipments={payout.shipments}
          variant="supplier"
          collapsible
        />
      ) : null}
    </section>
  );
}
