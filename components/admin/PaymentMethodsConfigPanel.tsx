"use client";

import { useState, useTransition, type FormEvent } from "react";
import { updateSubscriptionPagoMovil } from "@/lib/admin/payment-methods-actions";
import type { SubscriptionPagoMovilDetails } from "@/src/config/subscription-pago-movil";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PaymentMethodsConfigPanelProps {
  initialDetails: SubscriptionPagoMovilDetails;
}

export function PaymentMethodsConfigPanel({
  initialDetails,
}: PaymentMethodsConfigPanelProps) {
  const [bank, setBank] = useState(initialDetails.bank);
  const [phone, setPhone] = useState(initialDetails.phone);
  const [ci, setCi] = useState(initialDetails.ci);
  const [holderName, setHolderName] = useState(initialDetails.holderName);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.set("bank", bank);
    formData.set("phone", phone);
    formData.set("ci", ci);
    formData.set("holderName", holderName);

    startTransition(async () => {
      const result = await updateSubscriptionPagoMovil(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.details) {
        setBank(result.details.bank);
        setPhone(result.details.phone);
        setCi(result.details.ci);
        setHolderName(result.details.holderName);
      }
      setSuccess("Datos de Pago Móvil guardados. Ya se muestran en el checkout.");
    });
  }

  return (
    <div className="max-w-xl rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
        Pago Móvil de suscripciones
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Estos datos se muestran a los usuarios al subir el comprobante de Pro o
        Business.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <Label htmlFor="pm-bank">Banco</Label>
          <Input
            id="pm-bank"
            name="bank"
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            required
            disabled={pending}
            className="mt-1.5"
            placeholder="Ej. Mercantil"
            autoComplete="off"
          />
        </div>

        <div>
          <Label htmlFor="pm-phone">Teléfono</Label>
          <Input
            id="pm-phone"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            disabled={pending}
            className="mt-1.5"
            placeholder="Ej. 04121234567"
            inputMode="tel"
            autoComplete="off"
          />
        </div>

        <div>
          <Label htmlFor="pm-ci">Cédula / RIF</Label>
          <Input
            id="pm-ci"
            name="ci"
            value={ci}
            onChange={(e) => setCi(e.target.value)}
            required
            disabled={pending}
            className="mt-1.5"
            placeholder="Ej. V25074267 o J123456789"
            autoComplete="off"
          />
        </div>

        <div>
          <Label htmlFor="pm-holder">Nombre del titular</Label>
          <Input
            id="pm-holder"
            name="holderName"
            value={holderName}
            onChange={(e) => setHolderName(e.target.value)}
            disabled={pending}
            className="mt-1.5"
            placeholder="Nombre como aparece en el banco"
            autoComplete="off"
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            {success}
          </p>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar datos"}
        </Button>
      </form>
    </div>
  );
}
