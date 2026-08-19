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
import { formatExchangeRate, formatUsd, formatVes } from "@/lib/format";
import {
  SUPPLIER_B2B_PAYMENT_METHOD_KEYS,
  isSupplierB2bPaymentMethodKey,
  type SupplierB2bPaymentMethodKey,
} from "@/lib/supplier/payment-types";
import { getPaymentMethod } from "@/src/config/payment-methods";
import type { SubscriptionPaymentMethod } from "@/src/config/subscription-pago-movil";
import { SettlementCustomerShipments } from "@/components/dropship/SettlementCustomerShipments";
import { useStoreOrdersRealtimeRefresh } from "@/components/dashboard/orders/use-store-orders-realtime-refresh";
import { cn } from "@/lib/cn";

interface DailyDropshipSettlementCardProps {
  summary: DropshipDailySettlementSummary;
  paymentMethods: SubscriptionPaymentMethod[];
  /** Tasa BCV oficial vigente (USD → VES). */
  exchangeRate?: number | null;
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

function vesEquivalent(
  amountUsd: number,
  exchangeRate: number | null | undefined,
): number | null {
  if (
    !Number.isFinite(amountUsd) ||
    exchangeRate == null ||
    !Number.isFinite(exchangeRate) ||
    exchangeRate <= 0
  ) {
    return null;
  }
  return amountUsd * exchangeRate;
}

export function DailyDropshipSettlementCard({
  summary,
  paymentMethods,
  exchangeRate = null,
  variant = "card",
}: DailyDropshipSettlementCardProps) {
  const router = useRouter();
  const existing = summary.existing;
  const isApproved = existing?.status === "approved";
  const isReported = existing?.status === "reported";
  const hasPendingSales =
    !isApproved && summary.lines.length > 0 && summary.amountDueUsd > 0;
  const isPage = variant === "page";

  useStoreOrdersRealtimeRefresh(isPage ? summary.storeId : null);

  const [openForm, setOpenForm] = useState(isPage || isReported);
  const showForm = hasPendingSales && (isPage || openForm);
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
  const amountDueVes = vesEquivalent(summary.amountDueUsd, exchangeRate);
  const amountDueLabel =
    amountDueVes != null
      ? `${formatUsd(summary.amountDueUsd)} / ${formatVes(amountDueVes)}`
      : formatUsd(summary.amountDueUsd);

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
      setMessage(
        "Pago reportado. Alcéntimo lo verificará para habilitar los despachos.",
      );
      setProofFile(null);
      router.refresh();
    });
  }

  return (
    <section
      id="daily-dropship-settlement"
      className={cn("scroll-mt-24", isPage ? "space-y-5" : "card-panel mb-6")}
    >
      {isPage ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Cierre del {dateLabel}
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
      ) : (
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

      <div
        className={cn(
          "rounded-xl border border-teal-200 bg-teal-50/80 px-4 py-4 dark:border-teal-900/50 dark:bg-teal-950/30",
          !isPage && "mt-4",
        )}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
          Total a pagar a Alcéntimo
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-teal-950 dark:text-teal-50">
          {formatUsd(summary.amountDueUsd)}
        </p>
        {amountDueVes != null ? (
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-teal-800 dark:text-teal-200">
            {formatVes(amountDueVes)}
          </p>
        ) : (
          <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-200">
            No hay tasa BCV disponible. Usa el equivalente oficial del día
            antes de transferir.
          </p>
        )}
        <p className="mt-2 text-xs text-teal-800/90 dark:text-teal-200/80">
          {summary.orderCount} pedido{summary.orderCount === 1 ? "" : "s"} ·{" "}
          {summary.lineCount} producto{summary.lineCount === 1 ? "" : "s"}
          {exchangeRate != null && exchangeRate > 0
            ? ` · Tasa BCV Bs. ${formatExchangeRate(exchangeRate)} / USD`
            : ""}
        </p>
      </div>

      {summary.lines.length > 0 ? (
        <SettlementCustomerShipments
          className={cn(isPage && "card-panel")}
          lines={summary.lines}
          shipments={existing?.shipments}
          variant="merchant"
        />
      ) : null}

      {existing?.status === "rejected" && existing.reviewNotes ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
          role="alert"
        >
          Rechazado: {existing.reviewNotes}
        </p>
      ) : null}

      {isApproved ? (
        <p className="inline-flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2.5 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Pago verificado. Los mayoristas ya tienen las órdenes habilitadas
            para despacho
            {existing?.payouts[0]?.shipOn
              ? ` el ${formatBusinessDateEs(existing.payouts[0].shipOn)}`
              : " al día siguiente"}
            .
          </span>
        </p>
      ) : null}

      {existing?.paymentProofUrl ? (
        <p className="text-xs text-zinc-500">
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

      {hasPendingSales && !showForm ? (
        <button
          type="button"
          className="btn-brand inline-flex items-center gap-2"
          onClick={() => setOpenForm(true)}
        >
          <Banknote className="h-4 w-4" aria-hidden="true" />
          Reportar Pago Diario
        </button>
      ) : null}

      {showForm ? (
        <div className={cn("space-y-4", isPage && "card-panel")}>
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Reportar el pago consolidado
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Transfiere {amountDueLabel} a las cuentas de Alcéntimo e ingresa
              los datos de tu pago único.
            </p>
          </div>

          <div className="flex items-start gap-2 text-xs leading-relaxed text-zinc-500">
            <ShieldCheck
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600"
              aria-hidden="true"
            />
            <span>
              Un solo comprobante por el total del día. Al verificarlo, los
              mayoristas podrán despachar.
            </span>
          </div>

          <SubscriptionPaymentDetails
            paymentMethods={paymentMethods}
            hint={
              amountDueVes != null
                ? `Transfiere exactamente ${amountDueLabel} (tasa BCV del día) por Pago Móvil o transferencia y reporta una sola referencia.`
                : "Usa estos datos para la transferencia unificada y reporta una sola referencia."
            }
            transferAmount={amountDueLabel}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label-field" htmlFor="daily-pay-method">
                Banco / método
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
                Referencia
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
              Comprobante de la transferencia
            </label>
            <label
              htmlFor="daily-pay-proof"
              className="btn-brand-outline mt-1.5 flex w-full cursor-pointer items-center justify-center gap-2 !min-h-11"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              {proofFile
                ? proofFile.name
                : existing?.paymentProofUrl
                  ? "Reemplazar comprobante"
                  : "Adjuntar comprobante"}
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
            <p className="mt-1.5 text-xs text-zinc-500">
              JPG, PNG, WebP o GIF. Máximo 5 MB.
            </p>
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
              {isReported ? "Actualizar reporte" : "Enviar reporte de pago"}
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
      ) : null}

      {!hasPendingSales && !isApproved ? (
        <p className={cn("text-sm text-zinc-500", isPage && "card-panel")}>
          Cuando concretes ventas de productos mayoristas (pago confirmado),
          aparecerán aquí para liquidarlas en un solo pago a Alcéntimo.
        </p>
      ) : null}
    </section>
  );
}
