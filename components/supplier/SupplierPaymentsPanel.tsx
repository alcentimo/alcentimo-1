"use client";

import { useState, useTransition } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { PaymentConfigField } from "@/components/payments/PaymentConfigField";
import { PaymentMethodCard } from "@/components/payments/PaymentMethodCard";
import { SettingsSwitch } from "@/components/ui/SettingsSwitch";
import { saveSupplierPaymentConfig } from "@/lib/supplier/payment-actions";
import {
  DROPSHIP_CENTRAL_PAYMENT_NOTICE,
  SUPPLIER_PAYOUT_STATUS_LABELS,
  type SupplierPayoutObligationView,
} from "@/lib/dropship/settlement-types";
import { formatBusinessDateEs } from "@/lib/dropship/settlement-date";
import { formatUsd } from "@/lib/format";
import {
  SUPPLIER_B2B_PAYMENT_METHOD_KEYS,
  type SupplierB2bPaymentMethodKey,
  type SupplierPaymentConfig,
} from "@/lib/supplier/payment-types";
import { getPaymentMethod } from "@/src/config/payment-methods";
import { cn } from "@/lib/cn";

interface SupplierPaymentsPanelProps {
  initialConfig: SupplierPaymentConfig;
  payouts?: SupplierPayoutObligationView[];
}

export function SupplierPaymentsPanel({
  initialConfig,
  payouts = [],
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
      setMessage("Datos de pago guardados.");
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

  function saveForm() {
    persist(config, "form");
  }

  return (
    <div className="space-y-6">
      <div className="supplier-hub-card-header">
        <div>
          <p className="supplier-hub-section-label">Cobros B2B</p>
          <h1 className="supplier-hub-heading">Liquidaciones y datos de cobro</h1>
          <p className="supplier-hub-subheading">
            Alcéntimo te liquida el costo mayorista cuando aprueba el cierre
            diario del dropshipper. Publica aquí tus datos para recibir esas
            transferencias.
          </p>
        </div>
      </div>

      <div className="supplier-hub-soft-panel flex items-start gap-3">
        <ShieldCheck
          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
          aria-hidden="true"
        />
        <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
          {DROPSHIP_CENTRAL_PAYMENT_NOTICE}
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="supplier-hub-success">{message}</p> : null}

      {payouts.length > 0 ? (
        <section className="supplier-hub-card space-y-3">
          <div>
            <p className="supplier-hub-section-label">Obligaciones de Alcéntimo</p>
            <h2 className="supplier-hub-heading text-base">
              Pagos programados D+1
            </h2>
          </div>
          <ul className="space-y-2">
            {payouts.map((payout) => (
              <li
                key={payout.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm dark:border-zinc-800"
              >
                <div>
                  <p className="font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                    {formatUsd(payout.amountUsd)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {payout.orderCount} pedido{payout.orderCount === 1 ? "" : "s"}{" "}
                    · {payout.lineCount} línea
                    {payout.lineCount === 1 ? "" : "s"} · venta{" "}
                    {formatBusinessDateEs(payout.businessDate)} · despacho{" "}
                    {formatBusinessDateEs(payout.shipOn)}
                  </p>
                </div>
                <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-800 dark:bg-teal-950/40 dark:text-teal-200">
                  {SUPPLIER_PAYOUT_STATUS_LABELS[payout.status]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-zinc-500">
          Aún no hay obligaciones de pago. Aparecerán aquí cuando Alcéntimo
          apruebe el cierre diario de un dropshipper que vendió tus productos.
        </p>
      )}

      <section className="supplier-hub-card space-y-5">
        <div>
          <label className="label-field" htmlFor="supplier-wa-phone">
            WhatsApp para notificaciones de pago
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
            placeholder="Ej: 0414-1234567"
            disabled={pending}
          />
          <p className="mt-1 text-xs text-zinc-500">
            Los comerciantes usarán este número si Alcéntimo o el equipo de
            liquidación necesitan coordinar el pago.
          </p>
        </div>

        <div>
          <label className="label-field" htmlFor="supplier-pay-instructions">
            Instrucciones adicionales
          </label>
          <textarea
            id="supplier-pay-instructions"
            rows={3}
            className="input-field resize-none"
            value={config.instructions}
            onChange={(event) =>
              setConfig((current) => ({
                ...current,
                instructions: event.target.value,
              }))
            }
            placeholder="Ej: Enviar captura por WhatsApp con el número de pedido."
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
                  "rounded-2xl border border-emerald-100/90 p-4 dark:border-emerald-900/40",
                  method.enabled
                    ? "bg-white dark:bg-zinc-950"
                    : "bg-zinc-50/80 dark:bg-zinc-900/40",
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
          onClick={saveForm}
          disabled={pending}
        >
          {pending && savingKey === "form" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          Guardar datos de pago
        </button>
      </section>
    </div>
  );
}
