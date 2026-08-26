"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { PaymentConfigField } from "@/components/payments/PaymentConfigField";
import { PaymentMethodCard } from "@/components/payments/PaymentMethodCard";
import { SettingsSwitch } from "@/components/ui/SettingsSwitch";
import { saveSupplierPaymentConfig } from "@/lib/supplier/payment-actions";
import {
  SUPPLIER_B2B_PAYMENT_METHOD_KEYS,
  type SupplierB2bPaymentMethodKey,
  type SupplierPaymentConfig,
} from "@/lib/supplier/payment-types";
import { getPaymentMethod } from "@/src/config/payment-methods";
import { cn } from "@/lib/cn";

interface SupplierPaymentsPanelProps {
  initialConfig: SupplierPaymentConfig;
}

/** Cuenta bancaria / métodos para que Alcéntimo liquide al proveedor. */
export function SupplierPaymentsPanel({
  initialConfig,
}: SupplierPaymentsPanelProps) {
  const [config, setConfig] = useState(initialConfig);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [savingKey, setSavingKey] = useState<string | null>(null);

  function persist(next: SupplierPaymentConfig, key = "form") {
    setError(null);
    setMessage(null);
    setSavingKey(key);
    startTransition(async () => {
      const result = await saveSupplierPaymentConfig(next);
      setSavingKey(null);
      if (result.error || !result.config) {
        setError(result.error ?? "No se pudo guardar.");
        return;
      }
      setConfig(result.config);
      setMessage("Guardado.");
    });
  }

  function toggleMethod(key: SupplierB2bPaymentMethodKey, enabled: boolean) {
    const next: SupplierPaymentConfig = {
      ...config,
      methods: {
        ...config.methods,
        [key]: {
          ...config.methods[key],
          enabled,
        },
      },
    };
    setConfig(next);
    persist(next, key);
  }

  function updateField(
    key: SupplierB2bPaymentMethodKey,
    fieldKey: string,
    value: string,
  ) {
    setConfig((current) => ({
      ...current,
      methods: {
        ...current.methods,
        [key]: {
          ...current.methods[key],
          fields: {
            ...current.methods[key].fields,
            [fieldKey]: value,
          },
        },
      },
    }));
  }

  return (
    <div className="space-y-5">
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="supplier-hub-success">{message}</p> : null}

      <section className="supplier-hub-card space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Cuenta para liquidaciones de Alcéntimo
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Cómo te paga Alcéntimo por las compras mayoristas. No se usa para
            cobrar a clientes finales.
          </p>
        </div>

        <div>
          <label className="label-field" htmlFor="supplier-wa-phone">
            WhatsApp
          </label>
          <input
            id="supplier-wa-phone"
            className="input-field"
            value={config.whatsappPhone}
            onChange={(event) =>
              setConfig((current) => ({
                ...current,
                whatsappPhone: event.target.value,
              }))
            }
            placeholder="0414-1234567"
            disabled={pending}
          />
        </div>

        <div className="space-y-4">
          {SUPPLIER_B2B_PAYMENT_METHOD_KEYS.map((key) => {
            const meta = getPaymentMethod(key);
            if (!meta) return null;
            const method = config.methods[key];
            const isSaving = savingKey === key;

            return (
              <div
                key={key}
                className={cn(
                  "rounded-2xl border p-4",
                  method.enabled
                    ? "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                    : "border-zinc-100 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/40",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <PaymentMethodCard
                    methodKey={key}
                    variant="settings"
                    muted={!method.enabled}
                  />
                  <div className="flex items-center gap-2">
                    {isSaving ? (
                      <Loader2
                        className="h-4 w-4 animate-spin text-zinc-400"
                        aria-hidden="true"
                      />
                    ) : null}
                    <SettingsSwitch
                      id={`supplier-pay-${key}`}
                      label={`Activar ${meta.label}`}
                      checked={method.enabled}
                      onChange={(checked) => toggleMethod(key, checked)}
                      disabled={pending}
                    />
                  </div>
                </div>

                {method.enabled ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {meta.fields.map((field) =>
                      field.type === "qr-image" ? (
                        <div key={field.key} className="sm:col-span-2">
                          <label
                            className="label-field"
                            htmlFor={`supplier-${key}-${field.key}`}
                          >
                            {field.label} (URL)
                          </label>
                          <input
                            id={`supplier-${key}-${field.key}`}
                            className="input-field"
                            value={method.fields[field.key] ?? ""}
                            onChange={(event) =>
                              updateField(key, field.key, event.target.value)
                            }
                            placeholder="https://…"
                            disabled={pending}
                          />
                        </div>
                      ) : (
                        <div
                          key={field.key}
                          className={field.fullWidth ? "sm:col-span-2" : undefined}
                        >
                          <PaymentConfigField
                            methodKey={key}
                            field={field}
                            enabled={method.enabled}
                            value={method.fields[field.key] ?? ""}
                            onChange={(value) =>
                              updateField(key, field.key, value)
                            }
                          />
                        </div>
                      ),
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className="btn-brand"
          onClick={() => persist(config, "form")}
          disabled={pending}
        >
          {pending && savingKey === "form" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          Guardar
        </button>
      </section>
    </div>
  );
}
