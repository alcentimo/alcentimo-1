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
import { requestDashboardShellRefresh } from "@/lib/dashboard/shell-refresh";
import { useCountry } from "@/components/providers/CountryProvider";
import { getLocalShippingForCountry } from "@/lib/country-config";
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
      pricingMode: initialSettings.pricingMode,
      flatRateUsd: initialSettings.flatRateUsd,
      freeShippingEnabled: initialSettings.freeShippingEnabled,
      freeShippingMinUsd: initialSettings.freeShippingMinUsd,
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
        return;
      }
      requestDashboardShellRefresh();
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

  function renderLocalCard(key: ShippingCarrierKey) {
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
      saveLabel="Guardar entrega local"
      saving={savingForm}
      onSave={handleSaveForm}
    >
      <SettingsSection
        title="Logística nacional de Alcéntimo"
        description="Las agencias de encomienda (MRW, Zoom y cobro a destino o envío gratis) se aplican solas en tu vitrina. No las configuras tú."
        variant="payments"
      >
        <div className="rounded-xl border border-teal-500 bg-teal-50/70 p-4 ring-1 ring-teal-500/30 dark:border-teal-400 dark:bg-teal-950/30">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Envío nacional centralizado
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
            En el checkout tus clientes verán las agencias y las reglas de
            envío que define Alcéntimo (cobro a destino o envío gratis según el
            monto). Tú solo agregas, si quieres, entrega local o un punto de
            encuentro.
          </p>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Entrega local"
        description="Opcional: entregas personales en zonas o puntos de encuentro, y retiro sin tienda física."
        variant="payments"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {localShipping.map((method) => renderLocalCard(method.key))}
        </div>
      </SettingsSection>
    </SettingsTabShell>
  );
}
