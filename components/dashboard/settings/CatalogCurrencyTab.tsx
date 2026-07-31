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
    </SettingsTabShell>
  );
}
