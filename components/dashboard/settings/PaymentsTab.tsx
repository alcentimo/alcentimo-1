"use client";

import { useState, useTransition } from "react";
import { PaymentConfigField } from "@/components/payments/PaymentConfigField";
import { PaymentMethodCard } from "@/components/payments/PaymentMethodCard";
import { PaymentQrImageField } from "@/components/payments/PaymentQrImageField";
import { SettingsOptionCard } from "@/components/dashboard/settings/SettingsOptionCard";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import { SavingHint } from "@/components/dashboard/settings/SavingHint";
import { SettingsSwitch } from "@/components/ui/SettingsSwitch";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getFirstPaymentValidationError,
  validatePaymentsSettings,
  type PaymentFieldErrors,
} from "@/lib/payments/validate-payment-fields";
import { savePaymentsSettings } from "@/lib/settings/actions";
import { useCountry } from "@/components/providers/CountryProvider";
import { getPaymentMethod } from "@/src/config/payment-methods";
import type {
  PaymentMethodKey,
  PaymentsSettings,
} from "@/lib/store-settings/types";

interface PaymentsTabProps {
  initialSettings: PaymentsSettings;
}

function fieldErrorKey(methodKey: PaymentMethodKey, fieldKey: string): string {
  return `${methodKey}.${fieldKey}`;
}

export function PaymentsTab({ initialSettings }: PaymentsTabProps) {
  const { paymentGroups } = useCountry();
  const [payments, setPayments] = useState(initialSettings.methods);
  const [installments, setInstallments] = useState(initialSettings.installments);
  const [savingToggle, setSavingToggle] = useState<string | null>(null);
  const [savingForm, setSavingForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<PaymentFieldErrors>({});
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
    setSuccess(null);
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
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const fieldKey of Object.keys(next)) {
        if (fieldKey.startsWith(`${key}.`)) delete next[fieldKey];
      }
      return next;
    });
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
    setFieldErrors((prev) => {
      const errorKey = fieldErrorKey(key, fieldKey);
      if (!prev[errorKey]) return prev;
      const next = { ...prev };
      delete next[errorKey];
      return next;
    });
    setSuccess(null);
  }

  function setFieldError(
    methodKey: PaymentMethodKey,
    fieldKey: string,
    message: string | null,
  ) {
    const errorKey = fieldErrorKey(methodKey, fieldKey);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (message) next[errorKey] = message;
      else delete next[errorKey];
      return next;
    });
  }

  function handleSaveForm() {
    setError(null);
    setSuccess(null);

    const payload = buildPayload(payments, installments);
    const validationErrors = validatePaymentsSettings(payload);

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError(
        getFirstPaymentValidationError(validationErrors) ??
          "Revisa los campos de los métodos de pago activos.",
      );
      return;
    }

    setFieldErrors({});
    setSavingForm(true);
    startTransition(async () => {
      const result = await savePaymentsSettings(payload);
      setSavingForm(false);
      if (result.error) {
        setError(result.error);
        setPayments(initialSettings.methods);
        setInstallments(initialSettings.installments);
        return;
      }
      setSuccess("Configuración de pagos guardada correctamente.");
    });
  }

  function renderPaymentCard(key: PaymentMethodKey) {
    const meta = getPaymentMethod(key);
    const config = payments[key];
    const isSaving = savingToggle === `method-${key}`;

    return (
      <Card key={key} className="payment-method-settings-card overflow-hidden">
        <CardHeader className="border-b border-zinc-100 pb-5 dark:border-zinc-800/80">
          <PaymentMethodCard
            methodKey={key}
            variant="settings"
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
            <div className="mt-3">
              <SavingHint visible />
            </div>
          )}
        </CardHeader>

        {config.enabled && meta.fields.length > 0 && (
          <CardContent className="pt-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                  <PaymentConfigField
                    key={field.key}
                    methodKey={key}
                    field={field}
                    enabled={config.enabled}
                    value={config.fields[field.key] ?? ""}
                    error={fieldErrors[fieldErrorKey(key, field.key)]}
                    onChange={(value) => updateField(key, field.key, value)}
                    onBlurValidate={(message) =>
                      setFieldError(key, field.key, message)
                    }
                  />
                ),
              )}
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <SettingsTabShell
      error={error}
      saveLabel="Guardar pagos"
      saving={savingForm}
      onSave={handleSaveForm}
      saveHint="Los cambios se reflejan en el checkout de tu catálogo público."
    >
      {success && (
        <p
          className="mb-6 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-300"
          role="status"
        >
          {success}
        </p>
      )}

      {paymentGroups.map((group) => (
        <SettingsSection
          key={group.title}
          title={group.title}
          description={group.description}
          variant="payments"
        >
          <div className="flex flex-col gap-6">
            {group.keys.map((key) => renderPaymentCard(key))}
          </div>
        </SettingsSection>
      ))}

      <SettingsSection
        title="Venta a cuotas"
        description="Define condiciones para ofrecer pagos fraccionados."
        variant="payments"
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="installments-min" className="payment-field-label">
                Monto mínimo (USD)
              </Label>
              <Input
                id="installments-min"
                type="number"
                min={0}
                step="0.01"
                value={installments.minUsd}
                onChange={(e) =>
                  setInstallments((prev) => ({ ...prev, minUsd: e.target.value }))
                }
                className="mt-2 h-10"
              />
            </div>
            <div>
              <Label htmlFor="installments-max" className="payment-field-label">
                Máximo de cuotas
              </Label>
              <Input
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
                className="mt-2 h-10"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="installments-conditions" className="payment-field-label">
                Condiciones
              </Label>
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
                className="input-field mt-2 resize-none"
              />
            </div>
          </div>
        </SettingsOptionCard>
      </SettingsSection>
    </SettingsTabShell>
  );
}
