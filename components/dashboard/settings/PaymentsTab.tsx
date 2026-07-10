"use client";

import { useState, useTransition } from "react";
import { SettingsOptionCard } from "@/components/dashboard/settings/SettingsOptionCard";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import { savePaymentsSettings } from "@/lib/settings/actions";
import type {
  PaymentMethodKey,
  PaymentsSettings,
} from "@/lib/store-settings/types";

const PAYMENT_LABELS: Record<
  PaymentMethodKey,
  {
    label: string;
    description: string;
    fields: { key: string; label: string; placeholder: string }[];
  }
> = {
  pagoMovil: {
    label: "Pago Móvil",
    description: "Cobra en bolívares vía Pago Móvil bancario.",
    fields: [
      { key: "bank", label: "Banco", placeholder: "Ej: Banesco" },
      { key: "phone", label: "Teléfono", placeholder: "Ej: 0414-1234567" },
      { key: "ci", label: "Cédula / RIF", placeholder: "Ej: V-12.345.678" },
    ],
  },
  zelle: {
    label: "Zelle",
    description: "Recibe pagos en USD por Zelle.",
    fields: [
      { key: "email", label: "Correo Zelle", placeholder: "tu@email.com" },
      { key: "holder", label: "Titular", placeholder: "Nombre del titular" },
    ],
  },
  cashea: {
    label: "Cashea",
    description: "Permite compras con financiamiento Cashea.",
    fields: [
      {
        key: "merchantId",
        label: "ID comercio",
        placeholder: "ID asignado por Cashea",
      },
    ],
  },
  transferencia: {
    label: "Transferencia bancaria",
    description: "Transferencia directa a cuenta nacional.",
    fields: [
      { key: "bank", label: "Banco", placeholder: "Ej: Mercantil" },
      { key: "account", label: "Número de cuenta", placeholder: "0105-..." },
      { key: "holder", label: "Titular", placeholder: "Razón social o nombre" },
    ],
  },
  efectivoUsd: {
    label: "Efectivo USD",
    description: "Acepta dólares en efectivo al entregar.",
    fields: [],
  },
  puntoVenta: {
    label: "Punto de venta",
    description: "Tarjeta débito/crédito en tu local.",
    fields: [
      {
        key: "note",
        label: "Nota para el cliente",
        placeholder: "Ej: Solo tarjetas nacionales",
      },
    ],
  },
};

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

  return (
    <SettingsTabShell
      error={error}
      saveLabel="Guardar pagos"
      saving={savingForm}
      onSave={handleSaveForm}
    >
      <SettingsSection
        title="Métodos de pago"
        description="Elige qué formas de pago verán tus clientes al hacer pedidos."
      >
        {(Object.keys(PAYMENT_LABELS) as PaymentMethodKey[]).map((key) => {
          const meta = PAYMENT_LABELS[key];
          const config = payments[key];
          const isSaving = savingToggle === `method-${key}`;

          return (
            <SettingsOptionCard
              key={key}
              id={`pay-${key}`}
              label={meta.label}
              description={meta.description}
              checked={config.enabled}
              disabled={isSaving}
              saving={isSaving}
              onChange={(v) => togglePayment(key, v)}
            >
              {meta.fields.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {meta.fields.map((field) => (
                    <div
                      key={field.key}
                      className={field.key === "note" ? "sm:col-span-2" : ""}
                    >
                      <label htmlFor={`pay-${key}-${field.key}`} className="label-field">
                        {field.label}
                      </label>
                      <input
                        id={`pay-${key}-${field.key}`}
                        type="text"
                        value={config.fields[field.key] ?? ""}
                        onChange={(e) => updateField(key, field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="input-field"
                      />
                    </div>
                  ))}
                </div>
              )}
            </SettingsOptionCard>
          );
        })}
      </SettingsSection>

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
