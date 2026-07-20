"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Smartphone, Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CopyableInline } from "@/components/payments/CopyableInline";
import { submitBusinessUpgradePayment } from "@/lib/plans/business-upgrade-actions";
import type { BusinessUpgradePreview } from "@/lib/plans/get-business-upgrade-preview";
import { formatUsd, formatVes } from "@/lib/format";
import { getSubscriptionPagoMovilDetails } from "@/src/config/subscription-pago-movil";
import { DASHBOARD_PLANS_HREF } from "@/src/config/plans";

const MIN_SUBMIT_DURATION_MS = 5000;

interface UpgradeToBusinessPanelProps {
  preview: BusinessUpgradePreview;
  exchangeRate?: number | null;
}

export function UpgradeToBusinessPanel({
  preview,
  exchangeRate = null,
}: UpgradeToBusinessPanelProps) {
  const [referenceNumber, setReferenceNumber] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pagoMovil = getSubscriptionPagoMovilDetails();

  const proration = preview.proration;
  const pending = preview.pendingPayment;
  const amountDue = pending?.amount_due_usd ?? proration?.amountDueUsd ?? 0;
  const credit = pending?.credit_usd ?? proration?.creditUsd ?? 0;
  const daysRemaining =
    pending?.days_remaining ?? proration?.daysRemaining ?? 0;
  const listPrice = pending?.list_price_usd ?? proration?.listPriceUsd ?? 15;

  const vesEquivalent =
    exchangeRate != null && exchangeRate > 0 ? amountDue * exchangeRate : null;

  useEffect(() => {
    if (!submitting) {
      setSubmitProgress(0);
      return;
    }
    const frame = requestAnimationFrame(() => setSubmitProgress(100));
    return () => cancelAnimationFrame(frame);
  }, [submitting]);

  useEffect(() => {
    if (!proofFile) {
      setProofPreview(null);
      return;
    }
    const url = URL.createObjectURL(proofFile);
    setProofPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [proofFile]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!proofFile || submitting || pending) return;

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("billingPeriod", preview.billingPeriod);
    formData.set("referenceNumber", referenceNumber);
    formData.set("proofImage", proofFile);

    const startedAt = Date.now();
    const result = await submitBusinessUpgradePayment(formData);
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, MIN_SUBMIT_DURATION_MS - elapsed);
    if (remaining > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, remaining));
    }

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess(true);
  }

  if (!preview.eligible && !pending) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {preview.reason ??
            "Esta página solo está disponible para usuarios del plan Pro."}
        </p>
        <Link
          href={DASHBOARD_PLANS_HREF}
          className="mt-4 inline-flex text-sm font-medium text-teal-700 hover:underline dark:text-teal-300"
        >
          Ver planes
        </Link>
      </div>
    );
  }

  if (success || pending) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-6 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <div className="flex items-start gap-3">
          <CheckCircle2
            className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Comprobante en revisión
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Ya recibimos tu pago de upgrade a Business
              {amountDue > 0 ? ` por ${formatUsd(amountDue)}` : ""}. Tu acceso
              Business queda provisional mientras confirmamos el comprobante.
              No envíes otro comprobante mientras este esté pendiente.
            </p>
            {pending?.reference_number ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Referencia:{" "}
                <span className="font-mono">{pending.reference_number}</span>
              </p>
            ) : null}
            <Link
              href="/dashboard/catalogo"
              className="inline-flex text-sm font-medium text-teal-700 hover:underline dark:text-teal-300"
            >
              Volver al catálogo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Resumen del upgrade
        </p>
        <p className="mt-3 text-base leading-relaxed text-zinc-800 dark:text-zinc-100">
          Tu saldo a favor es de{" "}
          <strong className="text-teal-700 dark:text-teal-300">
            {formatUsd(credit)}
          </strong>
          . Para cambiarte a BUSINESS, solo debes pagar{" "}
          <strong className="text-zinc-950 dark:text-white">
            {formatUsd(amountDue)}
          </strong>
          .
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">
              Días restantes (Pro)
            </dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {daysRemaining}
            </dd>
          </div>
          <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">
              Precio Business
            </dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {formatUsd(listPrice)}
            </dd>
          </div>
          <div className="rounded-lg bg-teal-50 px-3 py-2 dark:bg-teal-950/40">
            <dt className="text-xs text-teal-700 dark:text-teal-300">
              Monto a pagar
            </dt>
            <dd className="mt-1 text-lg font-semibold text-teal-900 dark:text-teal-100">
              {formatUsd(amountDue)}
            </dd>
          </div>
        </dl>
        {vesEquivalent != null ? (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            Equivalente referencial: {formatVes(vesEquivalent)}
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            <Smartphone
              className="h-4 w-4 text-teal-600 dark:text-teal-400"
              aria-hidden="true"
            />
            Datos de Pago Móvil
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Transfiere exactamente {formatUsd(amountDue)} (a la tasa BCV del
            día) y sube el comprobante.
          </p>
          <dl className="mt-4 space-y-3">
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                Teléfono
              </dt>
              <dd className="mt-1">
                <CopyableInline value={pagoMovil.phone} label="Teléfono" mono />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                Cédula
              </dt>
              <dd className="mt-1">
                <CopyableInline value={pagoMovil.ci} label="Cédula" mono />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">Banco</dt>
              <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {pagoMovil.bank}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Reporta tu pago de {formatUsd(amountDue)}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Acceso Business provisional al enviar el comprobante.
              </p>
            </div>

            <div>
              <Label htmlFor="upgrade-reference" className="payment-field-label">
                Número de referencia <span className="text-red-500">*</span>
              </Label>
              <Input
                id="upgrade-reference"
                name="referenceNumber"
                value={referenceNumber}
                onChange={(event) => setReferenceNumber(event.target.value)}
                placeholder="Ej. 123456789"
                required
                disabled={submitting}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="payment-field-label">
                Captura del pago <span className="text-red-500">*</span>
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setProofFile(file);
                }}
              />
              <button
                type="button"
                disabled={submitting}
                onClick={() => fileInputRef.current?.click()}
                className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                {proofFile ? proofFile.name : "Subir comprobante"}
              </button>
              {proofPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={proofPreview}
                  alt="Vista previa del comprobante"
                  className="mt-3 max-h-40 w-full rounded-lg object-contain"
                />
              ) : null}
            </div>

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </p>
            ) : null}

            {submitting ? (
              <div className="space-y-2">
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-teal-600 transition-[width] duration-5000 ease-out"
                    style={{ width: `${submitProgress}%` }}
                  />
                </div>
                <p className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Enviando comprobante…
                </p>
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={submitting || !proofFile || referenceNumber.trim().length < 4}
              className="btn-brand w-full"
            >
              {submitting
                ? "Procesando…"
                : `Confirmar pago de ${formatUsd(amountDue)}`}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
