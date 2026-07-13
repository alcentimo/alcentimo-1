"use client";

import { useState, useTransition } from "react";
import { ShippingMethodCard } from "@/components/shipping/ShippingMethodCard";
import { SettingsSwitch } from "@/components/ui/SettingsSwitch";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import { SavingHint } from "@/components/dashboard/settings/SavingHint";
import { saveShippingSettings } from "@/lib/settings/actions";
import { useCountry } from "@/components/providers/CountryProvider";
import {
  getLocalShippingForCountry,
  getNationalCarriersForCountry,
} from "@/lib/country-config";
import { getShippingMethod } from "@/src/config/shipping-methods";
import type {
  ShippingCarrierKey,
  ShippingSettings,
} from "@/lib/store-settings/types";

interface ShippingTabProps {
  initialSettings: ShippingSettings;
}

export function ShippingTab({ initialSettings }: ShippingTabProps) {
  const { country } = useCountry();
  const nationalCarriers = getNationalCarriersForCountry(country);
  const localShipping = getLocalShippingForCountry(country);
  const [carriers, setCarriers] = useState(initialSettings.carriers);
  const [deliveryDetails, setDeliveryDetails] = useState(
    initialSettings.deliveryDetails,
  );
  const [savingToggle, setSavingToggle] = useState<ShippingCarrierKey | null>(
    null,
  );
  const [savingForm, setSavingForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function buildPayload(
    nextCarriers: ShippingSettings["carriers"],
    nextDetails: string,
  ): ShippingSettings {
    return {
      carriers: nextCarriers,
      deliveryDetails: nextDetails,
    };
  }

  function persist(
    payload: ShippingSettings,
    mode: "toggle" | "form",
    key?: ShippingCarrierKey,
  ) {
    setError(null);
    if (mode === "toggle" && key) setSavingToggle(key);
    if (mode === "form") setSavingForm(true);

    startTransition(async () => {
      const result = await saveShippingSettings(payload);
      if (mode === "toggle" && key) setSavingToggle(null);
      if (mode === "form") setSavingForm(false);

      if (result.error) {
        setError(result.error);
        setCarriers(initialSettings.carriers);
        setDeliveryDetails(initialSettings.deliveryDetails);
      }
    });
  }

  function setCarrier(key: ShippingCarrierKey, value: boolean) {
    const nextCarriers = { ...carriers, [key]: value };
    setCarriers(nextCarriers);
    persist(buildPayload(nextCarriers, deliveryDetails), "toggle", key);
  }

  function handleSaveForm() {
    persist(buildPayload(carriers, deliveryDetails), "form");
  }

  function renderCarrierCard(key: ShippingCarrierKey) {
    const isSaving = savingToggle === key;

    return (
      <div key={key} className="relative">
        <ShippingMethodCard
          carrierKey={key}
          action={
            <SettingsSwitch
              id={`ship-${key}`}
              label={getShippingMethod(key).label}
              checked={carriers[key]}
              onChange={(v) => setCarrier(key, v)}
              disabled={isSaving}
            />
          }
        />
        {isSaving && (
          <div className="mt-2 px-1">
            <SavingHint visible />
          </div>
        )}
        {key === "delivery" && carriers.delivery && (
          <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <label htmlFor="delivery-details" className="label-field">
              Detalles del delivery
            </label>
            <textarea
              id="delivery-details"
              rows={3}
              value={deliveryDetails}
              onChange={(e) => setDeliveryDetails(e.target.value)}
              placeholder="Ej: Delivery en Valencia — costo según zona, pedido mínimo $5"
              className="input-field mt-2 resize-none"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <SettingsTabShell
      error={error}
      saveLabel="Guardar envíos"
      saving={savingForm}
      onSave={handleSaveForm}
    >
      {nationalCarriers.length > 0 && (
        <SettingsSection
          title="Empresas de encomienda"
          description="Activa las opciones de envío nacional que ofreces a tus clientes."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {nationalCarriers.map((method) => renderCarrierCard(method.key))}
          </div>
        </SettingsSection>
      )}

      <SettingsSection
        title="Entrega local"
        description="Configura delivery propio y retiro en tienda."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {localShipping.map((method) => renderCarrierCard(method.key))}
        </div>
      </SettingsSection>
    </SettingsTabShell>
  );
}
