"use client";

import { useMemo, useState, useTransition } from "react";
import { SettingsOptionCard } from "@/components/dashboard/settings/SettingsOptionCard";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import {
  saveCatalogCurrencySettings,
  saveDropshipPricingSettings,
} from "@/lib/settings/actions";
import {
  formatDropshipMarginLabel,
  suggestRetailFromWholesaleCost,
} from "@/lib/dropship/margin";
import { formatUsd } from "@/lib/format";
import type {
  CatalogCurrencySettings,
  DropshipPricingSettings,
} from "@/lib/store-settings/types";

interface CatalogCurrencyTabProps {
  initialSettings: CatalogCurrencySettings;
  initialDropshipPricing: DropshipPricingSettings;
}

export function CatalogCurrencyTab({
  initialSettings,
  initialDropshipPricing,
}: CatalogCurrencyTabProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [dropship, setDropship] = useState(initialDropshipPricing);
  const [savingToggle, setSavingToggle] = useState<string | null>(null);
  const [savingMargin, setSavingMargin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const previewRetail = useMemo(
    () => suggestRetailFromWholesaleCost(10, dropship),
    [dropship],
  );

  function toggleSetting(
    key: "showOfficialRate" | "showBsConversion",
    checked: boolean,
  ) {
    const previousValue = settings[key];
    setSettings((prev) => ({ ...prev, [key]: checked }));
    setError(null);
    setSavingToggle(key);

    startTransition(async () => {
      const result = await saveCatalogCurrencySettings({ [key]: checked });
      setSavingToggle(null);
      if (result.error) {
        setError(result.error);
        setSettings((prev) => ({ ...prev, [key]: previousValue }));
      }
    });
  }

  function persistDropship(next: DropshipPricingSettings) {
    const previous = dropship;
    setDropship(next);
    setSavingMargin(true);
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveDropshipPricingSettings(next);
      setSavingMargin(false);
      if (result.error) {
        setError(result.error);
        setDropship(previous);
        return;
      }
      setMessage("Tu ganancia quedó guardada.");
    });
  }

  return (
    <SettingsTabShell error={error} hideSaveBar>
      <SettingsSection
        title="Tu ganancia"
        description="Cuando añades un producto del catálogo, usamos el precio mayorista más esta ganancia para calcular el precio en tu tienda."
        variant="payments"
      >
        <SettingsOptionCard
          id="dropship-enabled"
          label="Calcular mi precio de venta automáticamente"
          description="Recomendado. Así no tienes que poner el precio a mano en cada producto."
          checked={dropship.enabled}
          onChange={(checked) =>
            persistDropship({ ...dropship, enabled: checked })
          }
          saving={savingMargin}
        />

        {dropship.enabled ? (
          <div className="mt-4 space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label-field" htmlFor="dropship-margin-type">
                  Tipo de ganancia
                </label>
                <select
                  id="dropship-margin-type"
                  className="input-field"
                  value={dropship.marginType}
                  disabled={savingMargin}
                  onChange={(event) =>
                    persistDropship({
                      ...dropship,
                      marginType:
                        event.target.value === "fixed" ? "fixed" : "percent",
                    })
                  }
                >
                  <option value="percent">Porcentaje (%)</option>
                  <option value="fixed">Monto fijo (USD)</option>
                </select>
              </div>
              <div>
                <label className="label-field" htmlFor="dropship-margin-value">
                  Valor
                </label>
                <input
                  id="dropship-margin-value"
                  type="number"
                  min={0}
                  step={dropship.marginType === "percent" ? 1 : 0.01}
                  className="input-field"
                  value={dropship.marginValue}
                  disabled={savingMargin}
                  onChange={(event) =>
                    setDropship((current) => ({
                      ...current,
                      marginValue: Number(event.target.value),
                    }))
                  }
                  onBlur={() => persistDropship(dropship)}
                />
              </div>
            </div>

            <SettingsOptionCard
              id="dropship-auto-apply"
              label="Actualizar el precio si cambia el precio mayorista"
              description="Si lo dejas apagado, solo te avisamos con un precio sugerido."
              checked={dropship.autoApplyOnCostChange}
              onChange={(checked) =>
                persistDropship({
                  ...dropship,
                  autoApplyOnCostChange: checked,
                })
              }
              saving={savingMargin}
            />

            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Regla activa:{" "}
              <strong>{formatDropshipMarginLabel(dropship)}</strong>
              {previewRetail != null ? (
                <>
                  {" "}
                  · Ejemplo: mayorista {formatUsd(10)} → tu precio{" "}
                  {formatUsd(previewRetail)}
                </>
              ) : null}
            </p>
          </div>
        ) : null}

        {message ? (
          <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            {message}
          </p>
        ) : null}
      </SettingsSection>

      <SettingsSection
        title="Moneda en el catálogo"
        description="Qué ve tu cliente en la tienda pública. Los cálculos internos en bolívares siguen activos para pedidos."
        variant="payments"
      >
        <div className="space-y-3">
          <SettingsOptionCard
            id="show-official-rate"
            label="Mostrar tasa oficial en el catálogo"
            description="Muestra la tasa BCV del día como referencia en tu tienda."
            checked={settings.showOfficialRate}
            onChange={(checked) => toggleSetting("showOfficialRate", checked)}
            saving={savingToggle === "showOfficialRate"}
          />

          <SettingsOptionCard
            id="show-bs-conversion"
            label="Mostrar precios en bolívares"
            description="Si lo desactivas, tus clientes verán únicamente precios en USD."
            checked={settings.showBsConversion}
            onChange={(checked) => toggleSetting("showBsConversion", checked)}
            saving={savingToggle === "showBsConversion"}
          />
        </div>
      </SettingsSection>
    </SettingsTabShell>
  );
}
