"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Smartphone, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CopyableInline } from "@/components/payments/CopyableInline";
import { submitManualPayment } from "@/lib/plans/manual-payment-actions";
import { formatVes } from "@/lib/format";
import {
  formatPlanCheckoutSummary,
  getTierChargeUsd,
  type BillingPeriod,
  type PlanPricingTier,
} from "@/src/config/plan-pricing-ui";
import { getSubscriptionPagoMovilDetails } from "@/src/config/subscription-pago-movil";

const MIN_SUBMIT_DURATION_MS = 1800;

type CheckoutStep = "checkout" | "success";

interface PlanCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: PlanPricingTier | null;
  billing: BillingPeriod;
  exchangeRate?: number | null;
}

export function PlanCheckoutDialog({
  open,
  onOpenChange,
  tier,
  billing,
  exchangeRate = null,
}: PlanCheckoutDialogProps) {
  const [step, setStep] = useState<CheckoutStep>("checkout");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pagoMovil = getSubscriptionPagoMovilDetails();

  useEffect(() => {
    if (!open) return;
    setStep("checkout");
    setReferenceNumber("");
    setProofFile(null);
    setProofPreview(null);
    setSubmitting(false);
    setSubmitProgress(0);
    setError(null);
  }, [open, tier?.planId, billing]);

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

  function handleClose() {
    onOpenChange(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tier || tier.planId === "free" || !proofFile || submitting) return;

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("planId", tier.planId);
    formData.set("referenceNumber", referenceNumber);
    formData.set("proofImage", proofFile);

    const [result] = await Promise.all([
      submitManualPayment(formData),
      new Promise<void>((resolve) => setTimeout(resolve, MIN_SUBMIT_DURATION_MS)),
    ]);

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setStep("success");
  }

  if (!tier || tier.monthlyUsd <= 0) return null;

  const chargeUsd = getTierChargeUsd(tier, billing);
  const vesEquivalent =
    exchangeRate != null && exchangeRate > 0
      ? chargeUsd * exchangeRate
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} containerClassName="max-w-3xl">
      <DialogContent className="relative max-h-[90vh] overflow-y-auto p-0" onClose={handleClose}>
        {step === "success" ? (
          <SuccessView tier={tier} onClose={handleClose} />
        ) : (
          <div className="p-6 sm:p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-xl">Completa tu suscripción</DialogTitle>
              <DialogDescription>
                Realiza el Pago Móvil, sube tu captura y obtén acceso Pro de
                inmediato mientras verificamos el pago.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-8 md:grid-cols-2">
              <section className="space-y-4">
                <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Resumen
                  </p>
                  <p className="mt-2 text-base font-semibold text-neutral-900 dark:text-neutral-50">
                    {formatPlanCheckoutSummary(tier, billing)}
                  </p>
                  {vesEquivalent != null && (
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                      Equivalente referencial: {formatVes(vesEquivalent)}
                    </p>
                  )}
                </div>

                <div className="rounded-xl bg-neutral-100 p-4 dark:bg-neutral-900">
                  <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                    <Smartphone className="h-4 w-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                    Datos de Pago Móvil
                  </div>
                  <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                    Realiza el pago a la tasa BCV del día antes de confirmar.
                  </p>

                  <dl className="mt-4 space-y-3">
                    <PagoMovilField label="Teléfono" value={pagoMovil.phone} mono />
                    <PagoMovilField label="Cédula" value={pagoMovil.ci} mono />
                    <PagoMovilField label="Banco" value={pagoMovil.bank} />
                  </dl>
                </div>
              </section>

              <section>
                <form onSubmit={handleSubmit} className="flex h-full flex-col">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    Reporta tu pago
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Acceso de Confianza: activamos tu plan Pro al enviar el
                    comprobante.
                  </p>

                  <div className="mt-5 space-y-4">
                    <div>
                      <Label htmlFor="payment-reference" className="payment-field-label">
                        Número de referencia <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="payment-reference"
                        name="referenceNumber"
                        value={referenceNumber}
                        onChange={(event) => setReferenceNumber(event.target.value)}
                        placeholder="Ej. 123456789"
                        inputMode="numeric"
                        autoComplete="off"
                        required
                        disabled={submitting}
                        className="payment-field-input mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="payment-proof" className="payment-field-label">
                        Captura del pago <span className="text-red-500">*</span>
                      </Label>
                      <input
                        ref={fileInputRef}
                        id="payment-proof"
                        name="proofImage"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        required
                        disabled={submitting}
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          setProofFile(file);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={submitting}
                        className="mt-1.5 flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-sm text-neutral-600 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-300 dark:hover:bg-neutral-900"
                      >
                        <Upload className="h-5 w-5" aria-hidden="true" />
                        {proofFile ? proofFile.name : "Subir captura del pago"}
                      </button>
                      {proofPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={proofPreview}
                          alt="Vista previa del comprobante"
                          className="mt-2 max-h-32 w-full rounded-lg border border-neutral-200 object-contain dark:border-neutral-800"
                        />
                      ) : null}
                    </div>
                  </div>

                  {submitting ? (
                    <div
                      className="mt-4 space-y-3 rounded-xl border border-teal-200 bg-teal-50/60 p-4 dark:border-teal-900 dark:bg-teal-950/30"
                      role="status"
                      aria-live="polite"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-teal-800 dark:text-teal-200">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Procesando tu pago…
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-teal-100 dark:bg-teal-900/60">
                        <div
                          className="h-full rounded-full bg-teal-600 transition-[width] duration-[1800ms] ease-out dark:bg-teal-400"
                          style={{ width: `${submitProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : null}

                  {error && (
                    <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
                      {error}
                    </p>
                  )}

                  <div className="mt-auto pt-6">
                    <button
                      type="submit"
                      disabled={submitting || !proofFile}
                      className="btn-brand inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold disabled:opacity-60"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          Enviando…
                        </>
                      ) : (
                        "Confirmar pago y activar Pro"
                      )}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PagoMovilField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-neutral-500 dark:text-neutral-400">{label}</dt>
      <dd className="mt-0.5">
        <CopyableInline value={value} label={label} mono={mono} />
      </dd>
    </div>
  );
}

function SuccessView({
  tier,
  onClose,
}: {
  tier: PlanPricingTier;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center sm:px-10 sm:py-14">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400">
        <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
      </span>
      <h3 className="mt-5 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
        ¡Plan {tier.displayName} activado!
      </h3>
      <p className="mt-2 max-w-sm text-sm text-neutral-600 dark:text-neutral-400">
        Tu acceso Pro ya está disponible. Verificaremos tu pago en breve; si hay
        algún problema, te avisaremos por correo.
      </p>
      <Button type="button" className="btn-brand mt-8 min-w-[10rem]" onClick={onClose}>
        Entendido
      </Button>
    </div>
  );
}
