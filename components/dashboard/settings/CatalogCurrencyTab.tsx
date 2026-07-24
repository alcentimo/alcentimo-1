"use client";

import { useState, useTransition } from "react";
import { SettingsOptionCard } from "@/components/dashboard/settings/SettingsOptionCard";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import { saveCatalogCurrencySettings } from "@/lib/settings/actions";
import type { CatalogCurrencySettings } from "@/lib/store-settings/types";

interface CatalogCurrencyTabProps {
  initialSettings: CatalogCurrencySettings;
}

export function CatalogCurrencyTab({ initialSettings }: CatalogCurrencyTabProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [savingToggle, setSavingToggle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function persist(
    next: CatalogCurrencySettings,
    toggleKey: keyof CatalogCurrencySettings,
    previousValue: boolean,
  ) {
    setError(null);
    setSavingToggle(toggleKey);

    startTransition(async () => {
      const result = await saveCatalogCurrencySettings(next);
      setSavingToggle(null);

      if (result.error) {
        setError(result.error);
        setSettings((prev) => ({ ...prev, [toggleKey]: previousValue }));
      }
    });
  }

  function toggleSetting(
    key: keyof CatalogCurrencySettings,
    checked: boolean,
  ) {
    const previousValue = settings[key];
    const next = { ...settings, [key]: checked };
    setSettings(next);
    persist(next, key, previousValue);
  }

  return (
    <SettingsTabShell error={error} hideSaveBar>
      <SettingsSection
        title="Preferencias de moneda"
        description="Controla qué información cambiaria ve tu cliente en el catálogo público, carrito y checkout. Los cálculos internos en bolívares siguen activos para pedidos y reportes."
        variant="payments"
      >
        <div className="space-y-3">
          <SettingsOptionCard
            id="show-official-rate"
            label="Mostrar tasa oficial en el catálogo público"
            description="Muestra la tasa BCV del día como referencia en la vitrina de tu tienda."
            checked={settings.showOfficialRate}
            onChange={(checked) => toggleSetting("showOfficialRate", checked)}
            saving={savingToggle === "showOfficialRate"}
          />

          <SettingsOptionCard
            id="show-bs-conversion"
            label="Mostrar conversión a Bs en catálogo"
            description="Muestra precios en bolívares en productos, carrito y checkout. Si lo desactivas, tus clientes verán únicamente precios en USD."
            checked={settings.showBsConversion}
            onChange={(checked) => toggleSetting("showBsConversion", checked)}
            saving={savingToggle === "showBsConversion"}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Venta al mayor"
        description="Permite ofrecer precios especiales por volumen. Al activarlo, podrás configurar precio mayorista y cantidad mínima (MOQ) en cada producto."
        variant="payments"
      >
        <SettingsOptionCard
          id="wholesale-enabled"
          label="Activar venta al mayor en la tienda"
          description="Los clientes verán el precio mayorista cuando compren la cantidad mínima configurada en cada producto. Si lo desactivas, se usará solo el precio de detal."
          checked={settings.wholesaleEnabled}
          onChange={(checked) => toggleSetting("wholesaleEnabled", checked)}
          saving={savingToggle === "wholesaleEnabled"}
        />
      </SettingsSection>
    </SettingsTabShell>
  );
}
