"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CopyableInline } from "@/components/payments/CopyableInline";
import { submitPaymentReport } from "@/lib/plans/payment-report-actions";
import { formatVes } from "@/lib/format";
import {
  formatPlanCheckoutSummary,
  getTierChargeUsd,
  type BillingPeriod,
  type PlanPricingTier,
} from "@/src/config/plan-pricing-ui";
import { getSubscriptionPagoMovilDetails } from "@/src/config/subscription-pago-movil";
import { getVenezuelaBankOptions } from "@/src/config/venezuela-banks";

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
  const [originBank, setOriginBank] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pagoMovil = getSubscriptionPagoMovilDetails();

  useEffect(() => {
    if (!open) return;
    setStep("checkout");
    setReferenceNumber("");
    setOriginBank("");
    setSubmitting(false);
    setError(null);
  }, [open, tier?.planId, billing]);

  function handleClose() {
    onOpenChange(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tier || tier.planId === "free") return;

    setSubmitting(true);
    setError(null);

    const result = await submitPaymentReport({
      planId: tier.planId,
      billingPeriod: billing,
      referenceNumber,
      originBank,
    });

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
          <SuccessView onClose={handleClose} />
        ) : (
          <div className="p-6 sm:p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-xl">Completa tu suscripción</DialogTitle>
              <DialogDescription>
                Realiza el Pago Móvil y reporta la referencia para activar tu plan.
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
                    Ingresa los datos de la transferencia para que podamos verificarla.
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
                        className="payment-field-input mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="payment-origin-bank" className="payment-field-label">
                        Banco de origen <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        id="payment-origin-bank"
                        name="originBank"
                        value={originBank}
                        onChange={(event) => setOriginBank(event.target.value)}
                        required
                        className="payment-field-input mt-1.5"
                      >
                        <option value="" disabled>
                          Selecciona tu banco
                        </option>
                        {getVenezuelaBankOptions().map((bank) => (
                          <option key={bank} value={bank}>
                            {bank}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  {error && (
                    <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
                      {error}
                    </p>
                  )}

                  <div className="mt-auto pt-6">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-brand inline-flex w-full items-center justify-center px-4 py-3 text-sm font-semibold disabled:opacity-60"
                    >
                      {submitting ? "Enviando…" : "Confirmar pago"}
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

function SuccessView({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center sm:px-10 sm:py-14">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400">
        <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
      </span>
      <h3 className="mt-5 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
        ¡Pago reportado con éxito!
      </h3>
      <p className="mt-2 max-w-sm text-sm text-neutral-600 dark:text-neutral-400">
        Estamos verificando la transacción. Tu plan se activará en unos minutos.
      </p>
      <Button type="button" className="btn-brand mt-8 min-w-[10rem]" onClick={onClose}>
        Entendido
      </Button>
    </div>
  );
}
