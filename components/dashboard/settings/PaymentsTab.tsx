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
import { cn } from "@/lib/cn";
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

function clearMethodFieldErrors(
  errors: PaymentFieldErrors,
  methodKey: PaymentMethodKey,
): PaymentFieldErrors {
  const next = { ...errors };
  for (const key of Object.keys(next)) {
    if (key.startsWith(`${methodKey}.`)) delete next[key];
  }
  return next;
}

function filterErrorsForEnabledMethods(
  errors: PaymentFieldErrors,
  methods: PaymentsSettings["methods"],
): PaymentFieldErrors {
  const next: PaymentFieldErrors = {};
  for (const [key, message] of Object.entries(errors)) {
    const methodKey = key.split(".")[0] as PaymentMethodKey;
    if (methods[methodKey]?.enabled === true) {
      next[key] = message;
    }
  }
  return next;
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
    revertOnError?: () => void,
  ) {
    setError(null);
    setSuccess(null);
    if (mode === "toggle" && toggleKey) setSavingToggle(toggleKey);
    if (mode === "form") setSavingForm(true);

    startTransition(async () => {
      const result = await savePaymentsSettings(payload, {
        validate: mode === "form",
      });
      if (mode === "toggle" && toggleKey) setSavingToggle(null);
      if (mode === "form") setSavingForm(false);

      if (result.error) {
        setError(result.error);
        revertOnError?.();
        if (mode === "form") {
          setPayments(initialSettings.methods);
          setInstallments(initialSettings.installments);
        }
      }
    });
  }

  function togglePayment(key: PaymentMethodKey, enabled: boolean) {
    const previousEnabled = payments[key].enabled;
    const nextMethods = {
      ...payments,
      [key]: { ...payments[key], enabled },
    };
    setPayments(nextMethods);
    setFieldErrors((prev) => clearMethodFieldErrors(prev, key));
    persist(
      buildPayload(nextMethods, installments),
      "toggle",
      `method-${key}`,
      () => {
        setPayments((prev) => ({
          ...prev,
          [key]: { ...prev[key], enabled: previousEnabled },
        }));
      },
    );
  }

  function toggleInstallments(enabled: boolean) {
    const previousEnabled = installments.enabled;
    const nextInstallments = { ...installments, enabled };
    setInstallments(nextInstallments);
    persist(
      buildPayload(payments, nextInstallments),
      "toggle",
      "installments",
      () => {
        setInstallments((prev) => ({ ...prev, enabled: previousEnabled }));
      },
    );
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
    if (!payments[methodKey]?.enabled) return;

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
    const validationErrors = filterErrorsForEnabledMethods(
      validatePaymentsSettings(payload),
      payload.methods,
    );

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
      const result = await savePaymentsSettings(payload, { validate: true });
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
    const isActive = config.enabled;
    const hasFields = meta.fields.length > 0;

    return (
      <Card
        key={key}
        className={cn(
          "payment-method-settings-card overflow-hidden",
          !isActive && "payment-method-settings-card--inactive",
        )}
      >
        <CardHeader
          className={cn(
            "py-3",
            isActive && hasFields && "border-b border-zinc-100 dark:border-zinc-800/80",
          )}
        >
          <PaymentMethodCard
            methodKey={key}
            variant="settings"
            muted={!isActive}
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
            <div className="mt-2">
              <SavingHint visible />
            </div>
          )}
        </CardHeader>

        {hasFields && (
          <div
            className={cn(
              "payment-method-fields",
              isActive && "payment-method-fields--open",
            )}
            aria-hidden={!isActive}
          >
            <div className="payment-method-fields-inner">
              <CardContent className="pt-3">
                <div
                  className={cn(
                    "grid grid-cols-1 gap-3 sm:grid-cols-2",
                    !isActive && "pointer-events-none opacity-50",
                  )}
                >
                  {meta.fields.map((field) =>
                    field.type === "qr-image" ? (
                      <PaymentQrImageField
                        key={field.key}
                        id={`pay-${key}-${field.key}`}
                        label={field.label}
                        value={config.fields[field.key] ?? ""}
                        onChange={(url) => updateField(key, field.key, url)}
                        disabled={!isActive}
                      />
                    ) : (
                      <PaymentConfigField
                        key={field.key}
                        methodKey={key}
                        field={field}
                        enabled={isActive}
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
            </div>
          </div>
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
          className="mb-4 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-800 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-300"
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
          <div className="flex flex-col gap-3">
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                className="payment-field-input mt-1.5"
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
                className="payment-field-input mt-1.5"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="installments-conditions" className="payment-field-label">
                Condiciones
              </Label>
              <textarea
                id="installments-conditions"
                rows={2}
                value={installments.conditions}
                onChange={(e) =>
                  setInstallments((prev) => ({
                    ...prev,
                    conditions: e.target.value,
                  }))
                }
                className="input-field payment-field-textarea mt-1.5 resize-none"
              />
            </div>
          </div>
        </SettingsOptionCard>
      </SettingsSection>
    </SettingsTabShell>
  );
}
