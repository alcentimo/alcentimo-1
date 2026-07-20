"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock3, Loader2, Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { resubmitCorrectedManualPayment } from "@/lib/plans/resubmit-payment-correction";
import type { UserPaymentReview } from "@/lib/plans/get-user-payment-review";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/cn";

const PLAN_LABELS: Record<string, string> = {
  starter: "Pro",
  premium: "Business",
};

interface PaymentReviewPanelProps {
  review: UserPaymentReview;
}

export function PaymentReviewPanel({ review }: PaymentReviewPanelProps) {
  const { payment, needsCorrection, isPending } = review;
  const [referenceNumber, setReferenceNumber] = useState(
    payment.reference_number,
  );
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const planLabel = PLAN_LABELS[payment.plan_id] ?? payment.plan_id;
  const amountDue =
    payment.amount_due_usd != null ? Number(payment.amount_due_usd) : null;

  useEffect(() => {
    if (!proofFile) {
      setProofPreview(null);
      return;
    }
    const url = URL.createObjectURL(proofFile);
    setProofPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [proofFile]);

  async function handleResubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!proofFile || submitting) return;

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("paymentId", payment.id);
    formData.set("referenceNumber", referenceNumber);
    formData.set("proofImage", proofFile);

    const result = await resubmitCorrectedManualPayment(formData);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-6 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Comprobante reenviado
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Tu pago está otra vez bajo revisión. Te avisaremos cuando lo
              confirmemos.
            </p>
            <Link
              href="/dashboard/catalogo"
              className="mt-4 inline-flex text-sm font-medium text-teal-700 hover:underline dark:text-teal-300"
            >
              Volver al catálogo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div
        className={cn(
          "rounded-xl border p-6",
          needsCorrection
            ? "border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20"
            : "border-sky-200 bg-sky-50/70 dark:border-sky-900/50 dark:bg-sky-950/20",
        )}
      >
        <div className="flex items-start gap-3">
          {needsCorrection ? (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          ) : (
            <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" />
          )}
          <div className="min-w-0 space-y-2">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {needsCorrection
                ? "Necesitamos que corrijas tu comprobante"
                : "Pago en revisión"}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {needsCorrection
                ? "Tu solicitud de plan sigue activa, pero debemos revisar un nuevo comprobante antes de confirmarla. Puedes seguir usando tu acceso actual."
                : "Tu solicitud está siendo reevaluada. Puedes seguir usando el acceso que ya tienes mientras confirmamos el pago. No es necesario volver a activar la cuenta."}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Plan solicitado: <strong>{planLabel}</strong>
              {amountDue != null ? (
                <>
                  {" "}
                  · Monto: <strong>{formatUsd(amountDue)}</strong>
                </>
              ) : null}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Ref: <span className="font-mono">{payment.reference_number}</span>
            </p>
            {needsCorrection && payment.admin_note ? (
              <div className="rounded-lg border border-amber-200 bg-white/80 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-zinc-950/40 dark:text-amber-100">
                <p className="font-medium">Motivo de la corrección</p>
                <p className="mt-1 whitespace-pre-wrap">{payment.admin_note}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {needsCorrection ? (
        <form
          onSubmit={handleResubmit}
          className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Sube el comprobante corregido
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Puedes actualizar la referencia si el monto o el pago cambiaron.
            </p>
          </div>

          <div>
            <Label htmlFor="correction-reference">Número de referencia</Label>
            <Input
              id="correction-reference"
              value={referenceNumber}
              onChange={(event) => setReferenceNumber(event.target.value)}
              className="mt-1.5"
              required
              disabled={submitting}
            />
          </div>

          <div>
            <Label>Nueva captura</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(event) =>
                setProofFile(event.target.files?.[0] ?? null)
              }
            />
            <button
              type="button"
              disabled={submitting}
              onClick={() => fileInputRef.current?.click()}
              className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <Upload className="h-4 w-4" />
              {proofFile ? proofFile.name : "Subir comprobante corregido"}
            </button>
            {proofPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={proofPreview}
                alt="Vista previa"
                className="mt-3 max-h-40 w-full rounded-lg object-contain"
              />
            ) : null}
          </div>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            className="btn-brand w-full"
            disabled={submitting || !proofFile || referenceNumber.trim().length < 4}
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando…
              </span>
            ) : (
              "Reenviar comprobante"
            )}
          </Button>
        </form>
      ) : isPending ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Mientras reevaluamos tu solicitud puedes seguir usando tu acceso
          actual desde el{" "}
          <Link
            href="/dashboard/catalogo"
            className="font-medium text-teal-700 hover:underline dark:text-teal-300"
          >
            catálogo
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
