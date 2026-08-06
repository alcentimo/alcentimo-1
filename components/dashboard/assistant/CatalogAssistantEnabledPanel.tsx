"use client";

import { useState, useTransition } from "react";
import { SettingsOptionCard } from "@/components/dashboard/settings/SettingsOptionCard";
import { saveAiAssistantEnabledSettings } from "@/lib/settings/actions";

interface CatalogAssistantEnabledPanelProps {
  initialEnabled: boolean;
}

export function CatalogAssistantEnabledPanel({
  initialEnabled,
}: CatalogAssistantEnabledPanelProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();

  function handleChange(next: boolean) {
    const previous = enabled;
    setEnabled(next);
    setError(null);

    startSave(async () => {
      const result = await saveAiAssistantEnabledSettings(next);
      if (result.error) {
        setError(result.error);
        setEnabled(previous);
      }
    });
  }

  return (
    <div className="space-y-3">
      <SettingsOptionCard
        id="ai-assistant-enabled"
        label="Mostrar Asistente IA en el catálogo público"
        description="Habilita el botón de «Ayuda» y el widget de asistencia inteligente para los clientes que visiten tu tienda."
        checked={enabled}
        onChange={handleChange}
        disabled={isSaving}
        saving={isSaving}
      />
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
