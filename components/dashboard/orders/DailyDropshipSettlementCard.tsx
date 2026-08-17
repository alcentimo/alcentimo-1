"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { SubscriptionPaymentDetails } from "@/components/payments/SubscriptionPaymentDetails";
import { reportDropshipDailyPayment } from "@/lib/dropship/settlement-actions";
import { formatBusinessDateEs } from "@/lib/dropship/settlement-date";
import {
  DROPSHIP_CENTRAL_PAYMENT_NOTICE,
  DROPSHIP_SETTLEMENT_STATUS_LABELS,
  type DropshipDailySettlementSummary,
} from "@/lib/dropship/settlement-types";
import { formatUsd } from "@/lib/format";
import {
  SUPPLIER_B2B_PAYMENT_METHOD_KEYS,
  isSupplierB2bPaymentMethodKey,
  type SupplierB2bPaymentMethodKey,
} from "@/lib/supplier/payment-types";
import { getPaymentMethod } from "@/src/config/payment-methods";
import type { SubscriptionPaymentMethod } from "@/src/config/subscription-pago-movil";
import { cn } from "@/lib/cn";

interface DailyDropshipSettlementCardProps {
  summary: DropshipDailySettlementSummary;
  paymentMethods: SubscriptionPaymentMethod[];
  variant?: "card" | "page";
}

function statusClass(status: string): string {
  if (status === "approved") {
    return "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50";
  }
  if (status === "rejected") {
    return "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/50";
  }
  return "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50";
}

export function DailyDropshipSettlementCard({
  summary,
  paymentMethods,
  variant = "card",
}: DailyDropshipSettlementCardProps) {
  const router = useRouter();
  const existing = summary.existing;
  const isApproved = existing?.status === "approved";
  const isReported = existing?.status === "reported";
  const canReport = !isApproved && summary.amountDueUsd > 0;
  const isPage = variant === "page";

  const [openForm, setOpenForm] = useState(isPage || isReported);
  const [paymentMethod, setPaymentMethod] = useState<SupplierB2bPaymentMethodKey>(
    existing?.paymentMethod && isSupplierB2bPaymentMethodKey(existing.paymentMethod)
      ? existing.paymentMethod
      : "pagoMovil",
  );
  const [paymentReference, setPaymentReference] = useState(
    existing?.paymentReference ?? "",
  );
  const [paymentNotes, setPaymentNotes] = useState(existing?.paymentNotes ?? "");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dateLabel = useMemo(
    () => formatBusinessDateEs(summary.businessDate),
    [summary.businessDate],
  );

  function handleSubmit() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("paymentMethod", paymentMethod);
      formData.set("paymentReference", paymentReference);
      formData.set("paymentNotes", paymentNotes);
      if (proofFile) {
        formData.set("proofImage", proofFile);
      }
      const result = await reportDropshipDailyPayment(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage("Pago diario reportado. Alcéntimo lo verificará para habilitar los despachos D+1.");
      setProofFile(null);
      router.refresh();
    });
  }

  return (
    <section
      id="daily-dropship-settlement"
      className={cn(
        "scroll-mt-24",
        isPage ? "space-y-5" : "card-panel mb-6",
      )}
    >
      {isPage ? null : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="section-label">Cierre diario dropshipping</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Liquidación del {dateLabel}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {DROPSHIP_CENTRAL_PAYMENT_NOTICE}
            </p>
          </div>
          {existing ? (
            <span
              className={cn(
                "inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold",
                statusClass(existing.status),
              )}
            >
              {DROPSHIP_SETTLEMENT_STATUS_LABELS[existing.status]}
            </span>
          ) : null}
        </div>
      )}

      {isPage ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Cierre del {dateLabel} · markup operativo {summary.markupPercent}%
          </p>
          {existing ? (
            <span
              className={cn(
                "inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold",
                statusClass(existing.status),
              )}
            >
              {DROPSHIP_SETTLEMENT_STATUS_LABELS[existing.status]}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className={cn("mt-4 grid gap-3 sm:grid-cols-3", isPage && "mt-0")}>
        <article className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Ventas mayoristas
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {summary.orderCount}
          </p>
          <p className="text-xs text-zinc-500">
            {summary.lineCount} línea{summary.lineCount === 1 ? "" : "s"} ·{" "}
            {summary.suppliers.length} mayorista
            {summary.suppliers.length === 1 ? "" : "s"}
          </p>
        </article>
        <article className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Costo + markup {summary.markupPercent}%
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {formatUsd(summary.wholesaleCostUsd)}
          </p>
          <p className="text-xs text-zinc-500">
            Markup Alcéntimo: {formatUsd(summary.platformMarkupUsd)}
          </p>
        </article>
        <article className="rounded-xl border border-teal-200 bg-teal-50/80 px-3 py-3 dark:border-teal-900/50 dark:bg-teal-950/30">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
            A pagar a Alcéntimo
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums text-teal-950 dark:text-teal-50">
            {formatUsd(summary.amountDueUsd)}
          </p>
          <p className="text-xs text-teal-800/80 dark:text-teal-200/80">
            Pago único consolidado del día
          </p>
        </article>
      </div>

      {summary.lines.length > 0 ? (
        <div className={cn(isPage && "card-panel")}>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Ventas pendientes de liquidación
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Costo mayorista más markup operativo de Alcéntimo, por producto.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-[11px] uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                  <th className="py-2 pr-3 font-semibold">Producto</th>
                  <th className="py-2 pr-3 font-semibold">Pedido</th>
                  <th className="py-2 pr-3 text-right font-semibold">Cant.</th>
                  <th className="py-2 pr-3 text-right font-semibold">Costo</th>
                  <th className="py-2 pr-3 text-right font-semibold">Markup</th>
                  <th className="py-2 text-right font-semibold">A pagar</th>
                </tr>
              </thead>
              <tbody>
                {summary.lines.map((line, index) => (
                  <tr
                    key={`${line.catalogOrderId}-${line.supplierProductId ?? index}`}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/80"
                  >
                    <td className="py-2 pr-3 font-medium text-zinc-900 dark:text-zinc-50">
                      {line.productTitle}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs text-zinc-500">
                      #{line.catalogOrderId.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {line.quantity}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-zinc-600 dark:text-zinc-300">
                      {formatUsd(line.supplierPayoutUsd)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-zinc-600 dark:text-zinc-300">
                      {formatUsd(line.platformMarkupUsd)}
                    </td>
                    <td className="py-2 text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                      {formatUsd(line.lineDueUsd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {existing?.status === "rejected" && existing.reviewNotes ? (
        <p
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
          role="alert"
        >
          Rechazado: {existing.reviewNotes}
        </p>
      ) : null}

      {isApproved ? (
        <p className="mt-4 inline-flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2.5 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Pago verificado. Los mayoristas ya tienen las órdenes habilitadas
            para despacho D+1
            {existing?.payouts[0]?.shipOn
              ? ` (${formatBusinessDateEs(existing.payouts[0].shipOn)})`
              : ""}
            .
          </span>
        </p>
      ) : null}

      {existing?.paymentProofUrl ? (
        <p className="mt-3 text-xs text-zinc-500">
          Comprobante actual:{" "}
          <a
            href={existing.paymentProofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-300"
          >
            ver imagen
          </a>
          {existing.paymentReference ? ` · Ref. ${existing.paymentReference}` : ""}
        </p>
      ) : null}

      {canReport ? (
        <div className={cn("mt-5 space-y-4", isPage && "card-panel")}>
          {!openForm ? (
            <button
              type="button"
              className="btn-brand inline-flex items-center gap-2"
              onClick={() => setOpenForm(true)}
            >
              <Banknote className="h-4 w-4" aria-hidden="true" />
              Reportar Pago Diario
            </button>
          ) : (
            <div className={cn(!isPage && "space-y-4 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800", isPage && "space-y-4")}>
              {isPage ? (
                <div>
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    Datos del pago único
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Transfiere el consolidado a las cuentas de Alcéntimo y
                    adjunta el comprobante.
                  </p>
                </div>
              ) : null}
              <div className="flex items-start gap-2 text-xs leading-relaxed text-zinc-500">
                <ShieldCheck
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600"
                  aria-hidden="true"
                />
                <span>
                  Transfiere el total del día a las cuentas de Alcéntimo y
                  adjunta un solo comprobante.
                </span>
              </div>

              <SubscriptionPaymentDetails
                paymentMethods={paymentMethods}
                hint="Paga el consolidado del día a la tasa BCV vigente y reporta una sola referencia."
                transferAmount={formatUsd(summary.amountDueUsd)}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label-field" htmlFor="daily-pay-method">
                    Método usado
                  </label>
                  <select
                    id="daily-pay-method"
                    className="input-field"
                    value={paymentMethod}
                    onChange={(event) =>
                      setPaymentMethod(
                        event.target.value as SupplierB2bPaymentMethodKey,
                      )
                    }
                    disabled={pending}
                  >
                    {SUPPLIER_B2B_PAYMENT_METHOD_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {getPaymentMethod(key)?.label ?? key}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-field" htmlFor="daily-pay-ref">
                    Referencia de pago
                  </label>
                  <input
                    id="daily-pay-ref"
                    className="input-field"
                    value={paymentReference}
                    onChange={(event) => setPaymentReference(event.target.value)}
                    placeholder="Ej: 123456789"
                    disabled={pending}
                  />
                </div>
              </div>

              <div>
                <label className="label-field" htmlFor="daily-pay-notes">
                  Notas (opcional)
                </label>
                <textarea
                  id="daily-pay-notes"
                  rows={2}
                  className="input-field resize-none"
                  value={paymentNotes}
                  onChange={(event) => setPaymentNotes(event.target.value)}
                  disabled={pending}
                />
              </div>

              <div>
                <label className="label-field" htmlFor="daily-pay-proof">
                  Comprobante
                </label>
                <label
                  htmlFor="daily-pay-proof"
                  className="mt-1.5 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-3 py-2.5 text-sm text-zinc-600 hover:border-teal-400 dark:border-zinc-700 dark:text-zinc-300"
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  {proofFile
                    ? proofFile.name
                    : existing?.paymentProofUrl
                      ? "Reemplazar comprobante (opcional)"
                      : "Adjuntar imagen del comprobante"}
                </label>
                <input
                  id="daily-pay-proof"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={pending}
                  onChange={(event) =>
                    setProofFile(event.target.files?.[0] ?? null)
                  }
                />
              </div>

              {error ? (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
              {message ? (
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  {message}
                </p>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  className="btn-brand inline-flex flex-1 items-center justify-center gap-2"
                  onClick={handleSubmit}
                  disabled={pending}
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Banknote className="h-4 w-4" aria-hidden="true" />
                  )}
                  {isReported ? "Actualizar reporte diario" : "Enviar reporte de pago"}
                </button>
                {!isReported && !isPage ? (
                  <button
                    type="button"
                    className="btn-brand-outline !min-h-10"
                    onClick={() => setOpenForm(false)}
                    disabled={pending}
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      ) : !isApproved ? (
        <p className={cn("mt-4 text-sm text-zinc-500", isPage && "card-panel")}>
          No hay ventas confirmadas de productos mayoristas pendientes de
          liquidar hoy.
        </p>
      ) : null}
    </section>
  );
}
