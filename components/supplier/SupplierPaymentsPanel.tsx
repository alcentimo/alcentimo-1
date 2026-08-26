"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Wallet } from "lucide-react";
import { SupplierEmptyState } from "@/components/supplier/SupplierEmptyState";
import { SupplierIncomingPayoutCard } from "@/components/supplier/SupplierIncomingPayoutCard";
import { PaymentConfigField } from "@/components/payments/PaymentConfigField";
import { PaymentMethodCard } from "@/components/payments/PaymentMethodCard";
import { SettingsSwitch } from "@/components/ui/SettingsSwitch";
import { saveSupplierPaymentConfig } from "@/lib/supplier/payment-actions";
import {
  SUPPLIER_ALCENTIMO_PAYOUT_NOTICE,
  type SupplierPayoutObligationView,
} from "@/lib/dropship/settlement-types";
import { formatUsd } from "@/lib/format";
import {
  SUPPLIER_B2B_PAYMENT_METHOD_KEYS,
  type SupplierB2bPaymentMethodKey,
  type SupplierPaymentConfig,
} from "@/lib/supplier/payment-types";
import { getPaymentMethod } from "@/src/config/payment-methods";
import { cn } from "@/lib/cn";

type PayoutFilter = "all" | "open" | "paid";

const FILTERS: Array<{ key: PayoutFilter; label: string }> = [
  { key: "open", label: "Pendientes" },
  { key: "paid", label: "Pagados" },
  { key: "all", label: "Todos" },
];

interface SupplierPaymentsPanelProps {
  initialConfig: SupplierPaymentConfig;
  payouts?: SupplierPayoutObligationView[];
  creditedBalanceUsd?: number;
}

export function SupplierPaymentsPanel({
  initialConfig,
  payouts = [],
  creditedBalanceUsd = 0,
}: SupplierPaymentsPanelProps) {
  const [config, setConfig] = useState(initialConfig);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<PayoutFilter>("open");

  const counts = useMemo(
    () => ({
      all: payouts.length,
      open: payouts.filter((item) => item.status !== "paid").length,
      paid: payouts.filter((item) => item.status === "paid").length,
    }),
    [payouts],
  );

  const filtered = useMemo(
    () =>
      payouts.filter((item) =>
        filter === "all"
          ? true
          : filter === "paid"
            ? item.status === "paid"
            : item.status !== "paid",
      ),
    [filter, payouts],
  );

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
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="supplier-hub-success">{message}</p> : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Liquidaciones de Alcéntimo
            </h2>
            <p className="mt-1 max-w-xl text-xs text-zinc-500">
              {SUPPLIER_ALCENTIMO_PAYOUT_NOTICE}
            </p>
          </div>
          <p className="tabular-nums text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Saldo acreditado {formatUsd(creditedBalanceUsd)}
          </p>
        </div>

        {payouts.length > 0 ? (
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar liquidaciones">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={filter === item.key}
                onClick={() => setFilter(item.key)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  filter === item.key
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300",
                )}
              >
                {item.label}
                <span className="ml-1 tabular-nums opacity-70">
                  {counts[item.key]}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {payouts.length === 0 ? (
          <SupplierEmptyState
            icon={Wallet}
            title="Sin liquidaciones aún"
            description="Cuando Alcéntimo te pague por compras de inventario, cada movimiento quedará registrado aquí, igual que el reporte de pago del dropshipper pero a tu favor."
          />
        ) : filtered.length === 0 ? (
          <SupplierEmptyState
            icon={Wallet}
            title="Nada en este filtro"
            description="No hay liquidaciones con ese estado."
          />
        ) : (
          <div className="space-y-6">
            {filtered.map((payout) => (
              <SupplierIncomingPayoutCard key={payout.id} payout={payout} />
            ))}
          </div>
        )}
      </section>

      <section className="supplier-hub-card space-y-5">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Cuenta para liquidaciones
        </h2>

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
