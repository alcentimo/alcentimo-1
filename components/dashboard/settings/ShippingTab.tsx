"use client";

import { useState, useTransition } from "react";
import { HelpCircle } from "lucide-react";
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
import {
  getLocalShippingForCountry,
  getNationalCarriersForCountry,
} from "@/lib/country-config";
import { getShippingMethod } from "@/src/config/shipping-methods";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/cn";
import type {
  DeliveryMeetingPoint,
  DeliveryZone,
  ShippingCarrierKey,
  ShippingPricingMode,
  ShippingSettings,
} from "@/lib/store-settings/types";

interface ShippingTabProps {
  initialSettings: ShippingSettings;
}

function ShippingHelpHint({
  label,
  children,
}: {
  label: string;
  children: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-950/40 dark:hover:text-teal-300"
      >
        <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {open ? (
        <span
          role="tooltip"
          className="absolute left-0 top-full z-20 mt-1.5 w-64 rounded-xl border border-zinc-200 bg-white p-2.5 text-left text-[11px] leading-relaxed text-zinc-600 shadow-lg dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
        >
          {children}
        </span>
      ) : null}
    </span>
  );
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
  const [pricingMode, setPricingMode] = useState<ShippingPricingMode>(
    initialSettings.pricingMode,
  );
  const [flatRateUsd, setFlatRateUsd] = useState(
    String(initialSettings.flatRateUsd),
  );
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(
    initialSettings.freeShippingEnabled,
  );
  const [freeShippingMinUsd, setFreeShippingMinUsd] = useState(
    String(initialSettings.freeShippingMinUsd),
  );
  const [savingToggle, setSavingToggle] = useState<ShippingCarrierKey | null>(
    null,
  );
  const [savingForm, setSavingForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function parseAmount(value: string, fallback: number): number {
    const parsed = Number(value.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return Math.round(parsed * 100) / 100;
  }

  function buildPayload(
    nextCarriers: ShippingSettings["carriers"],
    nextDetails: string,
    nextDeliveryZones: DeliveryZone[],
    nextPickupPoints: DeliveryMeetingPoint[],
    nextPricingMode: ShippingPricingMode = pricingMode,
    nextFlatRate = flatRateUsd,
    nextFreeEnabled = freeShippingEnabled,
    nextFreeMin = freeShippingMinUsd,
  ): ShippingSettings {
    return {
      carriers: nextCarriers,
      deliveryDetails: nextDetails,
      deliveryZones: nextDeliveryZones,
      pickupPoints: nextPickupPoints,
      pricingMode: nextPricingMode,
      flatRateUsd: parseAmount(nextFlatRate, initialSettings.flatRateUsd),
      freeShippingEnabled: nextFreeEnabled,
      freeShippingMinUsd: parseAmount(
        nextFreeMin,
        initialSettings.freeShippingMinUsd,
      ),
    };
  }

  function revertToInitial() {
    setCarriers(initialSettings.carriers);
    setDeliveryDetails(initialSettings.deliveryDetails);
    setDeliveryZones(initialSettings.deliveryZones);
    setPickupPoints(initialSettings.pickupPoints);
    setPricingMode(initialSettings.pricingMode);
    setFlatRateUsd(String(initialSettings.flatRateUsd));
    setFreeShippingEnabled(initialSettings.freeShippingEnabled);
    setFreeShippingMinUsd(String(initialSettings.freeShippingMinUsd));
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
    if (pricingMode === "flat" && parseAmount(flatRateUsd, 0) <= 0) {
      setError("Indica una tarifa plana mayor a $0.");
      return;
    }
    if (freeShippingEnabled && parseAmount(freeShippingMinUsd, 0) <= 0) {
      setError("Indica un monto mínimo mayor a $0 para el envío gratis.");
      return;
    }
    persist(
      buildPayload(carriers, deliveryDetails, deliveryZones, pickupPoints),
      "form",
    );
  }

  function selectPricingMode(nextMode: ShippingPricingMode) {
    setPricingMode(nextMode);
    persist(
      buildPayload(
        carriers,
        deliveryDetails,
        deliveryZones,
        pickupPoints,
        nextMode,
      ),
      "form",
    );
  }

  function toggleFreeShipping(enabled: boolean) {
    setFreeShippingEnabled(enabled);
    persist(
      buildPayload(
        carriers,
        deliveryDetails,
        deliveryZones,
        pickupPoints,
        pricingMode,
        flatRateUsd,
        enabled,
      ),
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

  const flatPreview = parseAmount(flatRateUsd, initialSettings.flatRateUsd);
  const freeMinPreview = parseAmount(
    freeShippingMinUsd,
    initialSettings.freeShippingMinUsd,
  );

  return (
    <SettingsTabShell
      error={error}
      saveLabel="Guardar envíos"
      saving={savingForm}
      onSave={handleSaveForm}
    >
      <SettingsSection
        title="Cómo cobras el envío"
        description="Elige la modalidad que verá el cliente en el checkout. Puedes combinarla con envío gratis condicionado."
        variant="payments"
      >
        <div className="grid gap-3">
          <label
            className={cn(
              "flex cursor-pointer gap-3 rounded-xl border p-4 transition",
              pricingMode === "cod"
                ? "border-teal-500 bg-teal-50/70 ring-1 ring-teal-500/30 dark:border-teal-400 dark:bg-teal-950/30"
                : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950",
            )}
          >
            <input
              type="radio"
              name="shipping-pricing-mode"
              className="mt-1"
              checked={pricingMode === "cod"}
              onChange={() => selectPricingMode("cod")}
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Cobro a destino (recomendado)
                <ShippingHelpHint label="Qué es cobro a destino">
                  El cliente paga el costo del envío directamente en la agencia
                  (MRW, Tealca, Zoom, etc.) al retirar su paquete. Tú no adelantas
                  el flete ni lo sumas al total del pedido.
                </ShippingHelpHint>
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                Ideal en Venezuela: el flete lo paga el comprador en la oficina de
                la encomienda. En el checkout verá “Cobro a destino”.
              </span>
            </span>
          </label>

          <label
            className={cn(
              "flex cursor-pointer gap-3 rounded-xl border p-4 transition",
              pricingMode === "flat"
                ? "border-teal-500 bg-teal-50/70 ring-1 ring-teal-500/30 dark:border-teal-400 dark:bg-teal-950/30"
                : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950",
            )}
          >
            <input
              type="radio"
              name="shipping-pricing-mode"
              className="mt-1"
              checked={pricingMode === "flat"}
              onChange={() => selectPricingMode("flat")}
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Tarifa plana nacional
                <ShippingHelpHint label="Qué es tarifa plana">
                  Cobras un monto fijo de envío por adelantado (por ejemplo $3 o
                  $4) junto con el pedido. Útil si quieres cubrir parte del flete
                  o simplificar el cobro.
                </ShippingHelpHint>
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                Un solo costo de envío para todo el país, sumado al total del
                checkout.
              </span>

              {pricingMode === "flat" ? (
                <div className="mt-3 max-w-xs">
                  <label htmlFor="flat-rate-usd" className="label-field">
                    Costo de envío (USD)
                  </label>
                  <div className="relative mt-1.5">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-400">
                      $
                    </span>
                    <input
                      id="flat-rate-usd"
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      value={flatRateUsd}
                      onChange={(event) => setFlatRateUsd(event.target.value)}
                      className="input-field pl-7"
                      placeholder="3.00"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-zinc-500">
                    Vista previa: el cliente verá envío {formatUsd(flatPreview)}.
                  </p>
                </div>
              ) : null}
            </span>
          </label>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Envío gratis condicionado"
        description="Opcional: premia compras más grandes con envío sin costo."
        variant="payments"
      >
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Activar envío gratis
                <ShippingHelpHint label="Cómo funciona el envío gratis">
                  Cuando el carrito alcanza el monto mínimo, el checkout muestra
                  “Gratis” automáticamente (ya no cobro a destino ni tarifa
                  plana). Si no llega al mínimo, se aplica tu modalidad normal.
                </ShippingHelpHint>
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                Se calcula sobre el subtotal de productos (después de
                descuentos).
              </p>
            </div>
            <SettingsSwitch
              id="free-shipping-enabled"
              label="Envío gratis condicionado"
              checked={freeShippingEnabled}
              onChange={toggleFreeShipping}
            />
          </div>

          {freeShippingEnabled ? (
            <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <div className="max-w-xs">
                <label htmlFor="free-shipping-min" className="label-field">
                  Monto mínimo de compra (USD)
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-400">
                    $
                  </span>
                  <input
                    id="free-shipping-min"
                    type="number"
                    min="1"
                    step="0.01"
                    inputMode="decimal"
                    value={freeShippingMinUsd}
                    onChange={(event) =>
                      setFreeShippingMinUsd(event.target.value)
                    }
                    className="input-field pl-7"
                    placeholder="25"
                  />
                </div>
              </div>
              <p className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                Consejo: en Venezuela el flete nacional suele rondar $3–$6.
                Define un mínimo (por ejemplo {formatUsd(Math.max(freeMinPreview, 25))})
                que cubra tu margen y evite regalar envíos en pedidos pequeños.
              </p>
            </div>
          ) : null}
        </div>
      </SettingsSection>

      {nationalCarriers.length > 0 && (
        <SettingsSection
          title="Agencias de encomienda"
          description="Activa las oficinas que ofreces (MRW, Tealca, Zoom…). El cliente elige agencia y sucursal en el checkout."
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
