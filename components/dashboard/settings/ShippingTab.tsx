"use client";

import { useState, useTransition } from "react";
import { ShippingMethodCard } from "@/components/shipping/ShippingMethodCard";
import { SettingsSwitch } from "@/components/ui/SettingsSwitch";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import { DeliveryZonesEditor } from "@/components/dashboard/settings/DeliveryZonesEditor";
import { SavingHint } from "@/components/dashboard/settings/SavingHint";
import { saveShippingSettings } from "@/lib/settings/actions";
import { useCountry } from "@/components/providers/CountryProvider";
import {
  getLocalShippingForCountry,
  getNationalCarriersForCountry,
} from "@/lib/country-config";
import { getShippingMethod } from "@/src/config/shipping-methods";
import type {
  DeliveryMeetingPoint,
  DeliveryZone,
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
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>(
    initialSettings.deliveryZones,
  );
  const [pickupPoints, setPickupPoints] = useState<DeliveryMeetingPoint[]>(
    initialSettings.pickupPoints,
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
    nextDeliveryZones: DeliveryZone[],
    nextPickupPoints: DeliveryMeetingPoint[],
  ): ShippingSettings {
    return {
      carriers: nextCarriers,
      deliveryDetails: nextDetails,
      deliveryZones: nextDeliveryZones,
      pickupPoints: nextPickupPoints,
    };
  }

  function revertToInitial() {
    setCarriers(initialSettings.carriers);
    setDeliveryDetails(initialSettings.deliveryDetails);
    setDeliveryZones(initialSettings.deliveryZones);
    setPickupPoints(initialSettings.pickupPoints);
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
        revertToInitial();
      }
    });
  }

  function setCarrier(key: ShippingCarrierKey, value: boolean) {
    const nextCarriers = { ...carriers, [key]: value };
    setCarriers(nextCarriers);
    persist(
      buildPayload(nextCarriers, deliveryDetails, deliveryZones, pickupPoints),
      "toggle",
      key,
    );
  }

  function handleSaveForm() {
    persist(
      buildPayload(carriers, deliveryDetails, deliveryZones, pickupPoints),
      "form",
    );
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
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
              <label htmlFor="delivery-details" className="label-field">
                Detalles de la entrega personalizada
              </label>
              <textarea
                id="delivery-details"
                rows={3}
                value={deliveryDetails}
                onChange={(e) => setDeliveryDetails(e.target.value)}
                placeholder="Ej: Entregas en Valencia — costo según zona, pedido mínimo $5"
                className="input-field mt-2 resize-none"
              />
            </div>
            <DeliveryZonesEditor
              deliveryZones={deliveryZones}
              pickupPoints={pickupPoints}
              showDeliveryZones
              showPickupPoints={false}
              onDeliveryZonesChange={setDeliveryZones}
              onPickupPointsChange={setPickupPoints}
            />
          </div>
        )}
        {key === "pickup" && carriers.pickup && (
          <div className="mt-3">
            <DeliveryZonesEditor
              deliveryZones={deliveryZones}
              pickupPoints={pickupPoints}
              showDeliveryZones={false}
              showPickupPoints
              onDeliveryZonesChange={setDeliveryZones}
              onPickupPointsChange={setPickupPoints}
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
          title="Envío nacional"
          description="Activa las opciones de encomienda que ofreces."
          variant="payments"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {nationalCarriers.map((method) => renderCarrierCard(method.key))}
          </div>
        </SettingsSection>
      )}

      <SettingsSection
        title="Entrega local"
        description="Entregas personales en zonas o puntos de encuentro, y retiro sin tienda física. Ideal para negocios 100% online."
        variant="payments"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {localShipping.map((method) => renderCarrierCard(method.key))}
        </div>
      </SettingsSection>
    </SettingsTabShell>
  );
}
