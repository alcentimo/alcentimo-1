"use client";

import { useState, useTransition } from "react";
import { PaymentMethodCard } from "@/components/payments/PaymentMethodCard";
import { PaymentQrImageField } from "@/components/payments/PaymentQrImageField";
import { SettingsOptionCard } from "@/components/dashboard/settings/SettingsOptionCard";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import { SavingHint } from "@/components/dashboard/settings/SavingHint";
import { SettingsSwitch } from "@/components/ui/SettingsSwitch";
import { savePaymentsSettings } from "@/lib/settings/actions";
import {
  PAYMENT_METHOD_GROUPS,
  getPaymentMethod,
} from "@/src/config/payment-methods";
import type {
  PaymentMethodKey,
  PaymentsSettings,
} from "@/lib/store-settings/types";

interface PaymentsTabProps {
  initialSettings: PaymentsSettings;
}

export function PaymentsTab({ initialSettings }: PaymentsTabProps) {
  const [payments, setPayments] = useState(initialSettings.methods);
  const [installments, setInstallments] = useState(initialSettings.installments);
  const [savingToggle, setSavingToggle] = useState<string | null>(null);
  const [savingForm, setSavingForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function buildPayload(
    nextMethods: PaymentsSettings["methods"],
    nextInstallments: PaymentsSettings["installments"],
  ): PaymentsSettings {
    return {
      methods: nextMethods,
      installments: nextInstallments,
    };
  }

  function persist(
    payload: PaymentsSettings,
    mode: "toggle" | "form",
    toggleKey?: string,
  ) {
    setError(null);
    if (mode === "toggle" && toggleKey) setSavingToggle(toggleKey);
    if (mode === "form") setSavingForm(true);

    startTransition(async () => {
      const result = await savePaymentsSettings(payload);
      if (mode === "toggle" && toggleKey) setSavingToggle(null);
      if (mode === "form") setSavingForm(false);

      if (result.error) {
        setError(result.error);
        setPayments(initialSettings.methods);
        setInstallments(initialSettings.installments);
      }
    });
  }

  function togglePayment(key: PaymentMethodKey, enabled: boolean) {
    const nextMethods = {
      ...payments,
      [key]: { ...payments[key], enabled },
    };
    setPayments(nextMethods);
    persist(buildPayload(nextMethods, installments), "toggle", `method-${key}`);
  }

  function toggleInstallments(enabled: boolean) {
    const nextInstallments = { ...installments, enabled };
    setInstallments(nextInstallments);
    persist(buildPayload(payments, nextInstallments), "toggle", "installments");
  }

  function updateField(key: PaymentMethodKey, fieldKey: string, value: string) {
    setPayments((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        fields: { ...prev[key].fields, [fieldKey]: value },
      },
    }));
  }

  function handleSaveForm() {
    setError(null);
    setSavingForm(true);
    startTransition(async () => {
      const result = await savePaymentsSettings(buildPayload(payments, installments));
      setSavingForm(false);
      if (result.error) {
        setError(result.error);
        setPayments(initialSettings.methods);
        setInstallments(initialSettings.installments);
      }
    });
  }

  function renderPaymentCard(key: PaymentMethodKey) {
    const meta = getPaymentMethod(key);
    const config = payments[key];
    const isSaving = savingToggle === `method-${key}`;

    return (
      <div key={key} className="relative">
        <PaymentMethodCard
          methodKey={key}
          action={
            <SettingsSwitch
              id={`pay-${key}`}
              label={meta.label}
              checked={config.enabled}
              onChange={(v) => togglePayment(key, v)}
              disabled={isSaving}
            />
          }
        />
        {isSaving && (
          <div className="mt-2 px-1">
            <SavingHint visible />
          </div>
        )}
        {config.enabled && meta.fields.length > 0 && (
          <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {meta.fields.map((field) =>
                field.type === "qr-image" ? (
                  <PaymentQrImageField
                    key={field.key}
                    id={`pay-${key}-${field.key}`}
                    label={field.label}
                    value={config.fields[field.key] ?? ""}
                    onChange={(url) => updateField(key, field.key, url)}
                  />
                ) : (
                  <div
                    key={field.key}
                    className={field.fullWidth ? "sm:col-span-2" : ""}
                  >
                    <label
                      htmlFor={`pay-${key}-${field.key}`}
                      className="label-field"
                    >
                      {field.label}
                    </label>
                    <input
                      id={`pay-${key}-${field.key}`}
                      type="text"
                      value={config.fields[field.key] ?? ""}
                      onChange={(e) =>
                        updateField(key, field.key, e.target.value)
                      }
                      placeholder={field.placeholder}
                      className="input-field mt-2"
                    />
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <SettingsTabShell
      error={error}
      saveLabel="Guardar pagos"
      saving={savingForm}
      onSave={handleSaveForm}
    >
      {PAYMENT_METHOD_GROUPS.map((group) => (
        <SettingsSection
          key={group.title}
          title={group.title}
          description={group.description}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {group.keys.map((key) => renderPaymentCard(key))}
          </div>
        </SettingsSection>
      ))}

      <SettingsSection
        title="Venta a cuotas"
        description="Define condiciones para ofrecer pagos fraccionados."
      >
        <SettingsOptionCard
          id="pay-installments"
          label="Activar venta a cuotas"
          description="Muestra esta opción en el checkout cuando aplique."
          checked={installments.enabled}
          disabled={savingToggle === "installments"}
          saving={savingToggle === "installments"}
          onChange={toggleInstallments}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="installments-min" className="label-field">
                Monto mínimo (USD)
              </label>
              <input
                id="installments-min"
                type="number"
                min={0}
                step="0.01"
                value={installments.minUsd}
                onChange={(e) =>
                  setInstallments((prev) => ({ ...prev, minUsd: e.target.value }))
                }
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="installments-max" className="label-field">
                Máximo de cuotas
              </label>
              <input
                id="installments-max"
                type="number"
                min={2}
                max={12}
                step={1}
                value={installments.maxInstallments}
                onChange={(e) =>
                  setInstallments((prev) => ({
                    ...prev,
                    maxInstallments: e.target.value,
                  }))
                }
                className="input-field"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="installments-conditions" className="label-field">
                Condiciones
              </label>
              <textarea
                id="installments-conditions"
                rows={3}
                value={installments.conditions}
                onChange={(e) =>
                  setInstallments((prev) => ({
                    ...prev,
                    conditions: e.target.value,
                  }))
                }
                className="input-field resize-none"
              />
            </div>
          </div>
        </SettingsOptionCard>
      </SettingsSection>
    </SettingsTabShell>
  );
}
