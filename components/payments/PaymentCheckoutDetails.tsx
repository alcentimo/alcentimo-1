"use client";

import Image from "next/image";
import { getPaymentMethod } from "@/src/config/payment-methods";
import type { PaymentMethodKey } from "@/lib/store-settings/types";

interface PaymentCheckoutDetailsProps {
  methodKey: PaymentMethodKey;
  fields: Record<string, string>;
}

const HIDDEN_FIELD_KEYS = new Set(["qrImageUrl"]);

export function PaymentCheckoutDetails({
  methodKey,
  fields,
}: PaymentCheckoutDetailsProps) {
  const meta = getPaymentMethod(methodKey);
  const qrUrl = fields.qrImageUrl?.trim();

  const visibleFields = meta.fields.filter(
    (field) =>
      field.type !== "qr-image" &&
      !HIDDEN_FIELD_KEYS.has(field.key) &&
      fields[field.key]?.trim(),
  );

  if (visibleFields.length === 0 && !qrUrl) {
    return null;
  }

  return (
    <div className="mt-3 rounded-xl border border-teal-200/80 bg-teal-50/50 p-3 dark:border-teal-900/50 dark:bg-teal-950/20">
      <p className="text-xs font-semibold uppercase tracking-wide text-teal-800 dark:text-teal-300">
        Datos para pagar con {meta.label}
      </p>
      <dl className="mt-2 space-y-1.5">
        {visibleFields.map((field) => (
          <div key={field.key}>
            <dt className="text-xs text-zinc-500">{field.label}</dt>
            <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {fields[field.key]}
            </dd>
          </div>
        ))}
      </dl>
      {qrUrl && (
        <div className="mt-3">
          <p className="text-xs text-zinc-500">Escanea el código QR</p>
          <div className="relative mt-2 h-40 w-40 overflow-hidden rounded-lg border border-white bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <Image
              src={qrUrl}
              alt={`QR ${meta.label}`}
              fill
              sizes="160px"
              className="object-contain p-2"
            />
          </div>
        </div>
      )}
    </div>
  );
}
