"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Smartphone, X } from "lucide-react";
import { CopyableInline } from "@/components/payments/CopyableInline";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  getDefaultSubscriptionPaymentMethods,
  type SubscriptionPaymentMethod,
} from "@/src/config/subscription-pago-movil";
import { cn } from "@/lib/cn";

interface SubscriptionPaymentDetailsProps {
  paymentMethods?: SubscriptionPaymentMethod[];
  /** Texto auxiliar debajo del título. */
  hint?: string;
  /** Monto destacado a transferir (p. ej. "$6.73 / Bs. 5.160,97"). */
  transferAmount?: string | null;
  className?: string;
}

export function SubscriptionPaymentDetails({
  paymentMethods: paymentMethodsProp,
  hint = "Realiza el pago a la tasa BCV del día antes de confirmar.",
  transferAmount = null,
  className,
}: SubscriptionPaymentDetailsProps) {
  const paymentMethods = useMemo(
    () =>
      paymentMethodsProp && paymentMethodsProp.length > 0
        ? paymentMethodsProp
        : getDefaultSubscriptionPaymentMethods(),
    [paymentMethodsProp],
  );

  const [selectedMethodId, setSelectedMethodId] = useState(
    () => paymentMethods[0]?.id ?? null,
  );
  const [qrLightboxOpen, setQrLightboxOpen] = useState(false);

  useEffect(() => {
    const firstId = paymentMethods[0]?.id ?? null;
    if (!firstId) return;
    if (
      !selectedMethodId ||
      !paymentMethods.some((method) => method.id === selectedMethodId)
    ) {
      setSelectedMethodId(firstId);
    }
  }, [paymentMethods, selectedMethodId]);

  const selectedMethod =
    paymentMethods.find((method) => method.id === selectedMethodId) ??
    paymentMethods[0]!;

  const qrUrl = selectedMethod.qrImageUrl?.trim() || null;
  const contactLooksLikeEmail = selectedMethod.phone.includes("@");

  return (
    <>
      <div className={cn("rounded-xl bg-neutral-100 p-4 dark:bg-neutral-900", className)}>
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          <Smartphone
            className="h-4 w-4 text-teal-600 dark:text-teal-400"
            aria-hidden="true"
          />
          Datos de pago
        </div>
        {transferAmount ? (
          <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50/80 px-3 py-2.5 dark:border-teal-900/50 dark:bg-teal-950/30">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
              Transfiere exactamente
            </p>
            <p className="mt-1 text-base font-bold tracking-tight text-teal-950 dark:text-teal-50">
              {transferAmount}
            </p>
          </div>
        ) : null}
        {hint ? (
          <p
            className={cn(
              "mt-2 text-neutral-600 dark:text-neutral-400",
              transferAmount ? "text-sm font-medium text-neutral-700 dark:text-neutral-300" : "text-xs",
            )}
          >
            {hint}
          </p>
        ) : null}

        {paymentMethods.length > 1 ? (
          <div
            className="mt-3 flex gap-1.5 overflow-x-auto pb-1"
            role="tablist"
            aria-label="Métodos de pago"
          >
            {paymentMethods.map((method) => {
              const selected = method.id === selectedMethod.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setSelectedMethodId(method.id)}
                  className={cn(
                    "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                    selected
                      ? "bg-teal-600 text-white shadow-sm"
                      : "bg-white text-neutral-700 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-200",
                  )}
                >
                  {method.name}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm font-medium text-neutral-800 dark:text-neutral-100">
            {selectedMethod.name}
          </p>
        )}

        <div
          className={cn(
            "mt-4",
            qrUrl && "flex flex-col gap-4 sm:flex-row sm:items-start",
          )}
        >
          {qrUrl ? (
            <button
              type="button"
              onClick={() => setQrLightboxOpen(true)}
              className="mx-auto w-full max-w-[160px] shrink-0 overflow-hidden rounded-xl border border-white bg-white shadow-md transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-neutral-700 dark:bg-neutral-950 sm:mx-0"
              aria-label="Ampliar código QR"
            >
              <span className="relative block aspect-square w-full">
                <Image
                  src={qrUrl}
                  alt={`QR ${selectedMethod.name}`}
                  fill
                  sizes="160px"
                  className="object-contain p-2"
                />
              </span>
              <span className="block px-2 pb-2 text-center text-[10px] text-neutral-500 dark:text-neutral-400">
                Toca para ampliar
              </span>
            </button>
          ) : null}

          <dl className="min-w-0 flex-1 space-y-3">
            <PaymentField label="Banco / Plataforma" value={selectedMethod.bank} />
            <PaymentField
              label={contactLooksLikeEmail ? "Correo" : "Teléfono"}
              value={selectedMethod.phone}
              mono
            />
            <PaymentField label="Cédula / RIF" value={selectedMethod.ci} mono />
            {selectedMethod.holderName ? (
              <PaymentField
                label="Nombre del titular"
                value={selectedMethod.holderName}
              />
            ) : null}
          </dl>
        </div>
      </div>

      {qrUrl ? (
        <Dialog
          open={qrLightboxOpen}
          onOpenChange={setQrLightboxOpen}
          containerClassName="max-w-md"
        >
          <DialogContent className="p-4" onClose={() => setQrLightboxOpen(false)}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                QR — {selectedMethod.name}
              </p>
              <button
                type="button"
                onClick={() => setQrLightboxOpen(false)}
                className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="relative mx-auto mt-3 aspect-square w-full max-w-[320px] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
              <Image
                src={qrUrl}
                alt={`QR ampliado ${selectedMethod.name}`}
                fill
                sizes="320px"
                className="object-contain p-3"
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

function PaymentField({
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
