"use client";

import { useState, useTransition } from "react";
import { SettingsOptionCard } from "@/components/dashboard/settings/SettingsOptionCard";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import { saveCatalogCurrencySettings } from "@/lib/settings/actions";

interface WholesaleTabProps {
  initialEnabled: boolean;
}

/** Preferencias de precio mayorista (sección propia en ajustes). */
export function WholesaleTab({ initialEnabled }: WholesaleTabProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggleWholesale(checked: boolean) {
    const previous = enabled;
    setEnabled(checked);
    setError(null);
    setSaving(true);

    startTransition(async () => {
      const result = await saveCatalogCurrencySettings({
        wholesaleEnabled: checked,
      });
      setSaving(false);
      if (result.error) {
        setError(result.error);
        setEnabled(previous);
      }
    });
  }

  return (
    <SettingsTabShell error={error} hideSaveBar>
      <SettingsSection
        title="Venta al mayor"
        description="Ofrece precios especiales por volumen. Al activarlo, podrás configurar precio mayorista y cantidad mínima (MOQ) en cada producto del catálogo."
        variant="payments"
      >
        <SettingsOptionCard
          id="wholesale-enabled"
          label="Activar venta al mayor en la tienda"
          description="Los clientes verán el precio mayorista cuando compren la cantidad mínima configurada en cada producto. Si lo desactivas, se usará solo el precio de detal."
          checked={enabled}
          onChange={toggleWholesale}
          saving={saving}
        />
      </SettingsSection>
    </SettingsTabShell>
  );
}
