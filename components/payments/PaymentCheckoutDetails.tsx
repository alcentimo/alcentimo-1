"use client";

import Image from "next/image";
import { CopyableValue } from "@/components/payments/CopyableValue";
import { getPaymentMethod } from "@/src/config/payment-methods";
import type { PaymentMethodKey } from "@/lib/store-settings/types";

interface PaymentCheckoutDetailsProps {
  methodKey: PaymentMethodKey;
  fields: Record<string, string>;
}

const HIDDEN_FIELD_KEYS = new Set(["qrImageUrl"]);
const MONO_FIELD_KEYS = new Set([
  "walletAddress",
  "account",
  "payId",
  "merchantId",
  "ci",
]);

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
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Usa estos datos para completar tu pago antes de confirmar el pedido.
      </p>
      <dl className="mt-3 space-y-3">
        {visibleFields.map((field) => {
          const fieldValue = fields[field.key] ?? "";
          const useMono = MONO_FIELD_KEYS.has(field.key);

          return (
            <div key={field.key}>
              <dt className="text-xs text-zinc-500">{field.label}</dt>
              <dd className="mt-0.5">
                {field.copyable ? (
                  <CopyableValue
                    value={fieldValue}
                    label={field.label}
                    mono={useMono}
                  />
                ) : (
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {fieldValue}
                  </span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      {qrUrl && (
        <div className="mt-4 border-t border-teal-200/60 pt-3 dark:border-teal-900/40">
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Escanea el código QR del banco
          </p>
          <div className="relative mt-2 h-44 w-44 overflow-hidden rounded-lg border border-white bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <Image
              src={qrUrl}
              alt={`QR ${meta.label}`}
              fill
              sizes="176px"
              className="object-contain p-2"
            />
          </div>
        </div>
      )}
    </div>
  );
}
