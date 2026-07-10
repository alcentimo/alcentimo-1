"use client";

import { useState, useTransition } from "react";
import { SettingsOptionCard } from "@/components/dashboard/settings/SettingsOptionCard";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import { saveShippingSettings } from "@/lib/settings/actions";
import type {
  ShippingCarrierKey,
  ShippingSettings,
} from "@/lib/store-settings/types";

const CARRIER_OPTIONS: {
  key: ShippingCarrierKey;
  label: string;
  description: string;
}[] = [
  {
    key: "mrw",
    label: "MRW",
    description: "Envíos por agencia MRW a nivel nacional.",
  },
  {
    key: "tealca",
    label: "Tealca",
    description: "Cobertura vía Tealca en ciudades principales.",
  },
  {
    key: "zoom",
    label: "Zoom",
    description: "Entregas con Zoom Delivery o agencia aliada.",
  },
  {
    key: "domesa",
    label: "Domesa",
    description: "Opción de encomienda Domesa para tu catálogo.",
  },
];

interface ShippingTabProps {
  initialSettings: ShippingSettings;
}

export function ShippingTab({ initialSettings }: ShippingTabProps) {
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

  return (
    <SettingsTabShell
      error={error}
      saveLabel="Guardar envíos"
      saving={savingForm}
      onSave={handleSaveForm}
    >
      <SettingsSection
        title="Empresas de encomienda"
        description="Activa las opciones de envío nacional que ofreces a tus clientes."
      >
        {CARRIER_OPTIONS.map((option) => (
          <SettingsOptionCard
            key={option.key}
            id={`ship-${option.key}`}
            label={option.label}
            description={option.description}
            checked={carriers[option.key]}
            disabled={savingToggle === option.key}
            saving={savingToggle === option.key}
            onChange={(v) => setCarrier(option.key, v)}
          />
        ))}
      </SettingsSection>

      <SettingsSection
        title="Entrega local"
        description="Configura delivery propio y retiro en tienda."
      >
        <SettingsOptionCard
          id="ship-delivery"
          label="Delivery"
          description="Ofrece entrega a domicilio en tu zona."
          checked={carriers.delivery}
          disabled={savingToggle === "delivery"}
          saving={savingToggle === "delivery"}
          onChange={(v) => setCarrier("delivery", v)}
        >
          <div>
            <label htmlFor="delivery-details" className="label-field">
              Detalles del delivery
            </label>
            <textarea
              id="delivery-details"
              rows={3}
              value={deliveryDetails}
              onChange={(e) => setDeliveryDetails(e.target.value)}
              placeholder="Ej: Delivery en Valencia — costo según zona, pedido mínimo $5"
              className="input-field resize-none"
            />
          </div>
        </SettingsOptionCard>

        <SettingsOptionCard
          id="ship-pickup"
          label="Retiro en tienda"
          description="El cliente recoge el pedido en tu local."
          checked={carriers.pickup}
          disabled={savingToggle === "pickup"}
          saving={savingToggle === "pickup"}
          onChange={(v) => setCarrier("pickup", v)}
        />
      </SettingsSection>
    </SettingsTabShell>
  );
}
