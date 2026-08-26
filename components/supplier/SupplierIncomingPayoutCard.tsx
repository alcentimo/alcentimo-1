"use client";

import { useMemo } from "react";
import { CheckCircle2, Package, Truck } from "lucide-react";
import { SupplierPayoutProofPreview } from "@/components/supplier/SupplierPayoutProofPreview";
import { formatBusinessDateEs } from "@/lib/dropship/settlement-date";
import {
  SUPPLIER_PAYOUT_STATUS_LABELS,
  type SupplierPayoutObligationView,
} from "@/lib/dropship/settlement-types";
import { formatUsd } from "@/lib/format";
import { isSupplierB2bPaymentMethodKey } from "@/lib/supplier/payment-types";
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
    ? isSupplierB2bPaymentMethodKey(payout.paymentMethod)
      ? (getPaymentMethod(payout.paymentMethod).label ?? payout.paymentMethod)
      : payout.paymentMethod
    : null;
  const productUnits = useMemo(
    () => payout.products.reduce((sum, item) => sum + item.quantity, 0),
    [payout.products],
  );

  return (
    <section className="space-y-3">
      <p className="inline-flex w-full items-start gap-2 rounded-xl border border-teal-200 bg-teal-50/80 px-3 py-2.5 text-sm text-teal-950 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-100">
        <Truck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          Alcéntimo se encarga de pasar a retirar esta mercancía en tu almacén
          y despacharla a los clientes. Tú solo apartas el stock; no entregas
          ni cobras a nadie más.
        </span>
      </p>

      {isPaid ? (
        <p className="inline-flex w-full items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2.5 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Pago registrado por Alcéntimo. Ya puedes marcar los productos
            listos para recolección
            {payout.shipOn
              ? ` a partir del ${formatBusinessDateEs(payout.shipOn)}`
              : ""}
            .
          </span>
        </p>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          Aparta el stock. El retiro se habilita cuando Alcéntimo registre
          este pago (el comprobante aparecerá aquí).
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-teal-100 bg-teal-50/90 px-4 py-4 sm:px-5 dark:border-teal-900/40 dark:bg-teal-950/30">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
              Compra de Alcéntimo · {dateLabel}
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
            {payout.products.length > 0
              ? `${payout.products.length} producto${payout.products.length === 1 ? "" : "s"} · ${productUnits} unidad${productUnits === 1 ? "" : "es"}`
              : `${payout.lineCount} producto${payout.lineCount === 1 ? "" : "s"}`}
            {payout.shipOn
              ? ` · retiro ${formatBusinessDateEs(payout.shipOn)}`
              : ""}
          </p>
        </div>

        <div className="space-y-3 px-4 py-4 sm:px-5">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Comprobante de pago de Alcéntimo
            </p>
            {payout.paymentProofUrl ? (
              <>
                <SupplierPayoutProofPreview
                  className="mt-2"
                  url={payout.paymentProofUrl}
                  label="Ver comprobante"
                />
                <p className="mt-2 text-xs text-zinc-500">
                  {methodLabel ? `${methodLabel}` : "Pago"}
                  {payout.paymentReference
                    ? ` · Ref. ${payout.paymentReference}`
                    : ""}
                </p>
              </>
            ) : isPaid ? (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                Pagado, pero aún no hay comprobante visible. Si falta, contacta
                a Alcéntimo.
              </p>
            ) : (
              <p className="mt-1 text-xs text-zinc-500">
                El comprobante aparecerá aquí cuando Alcéntimo liquide y lo
                cargue.
              </p>
            )}
          </div>
        </div>
      </div>

      {payout.products.length > 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-start gap-2">
            <Package
              className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Productos que Alcéntimo te compra
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Detalle consolidado de esta liquidación. Prepara estas
                unidades para el retiro.
              </p>
              <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
                {payout.products.map((product, index) => (
                  <li
                    key={`${product.title}-${index}`}
                    className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {product.title}
                      </span>
                      <span className="text-xs tabular-nums text-zinc-500">
                        ×{product.quantity}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                      {formatUsd(product.amountUsd)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
