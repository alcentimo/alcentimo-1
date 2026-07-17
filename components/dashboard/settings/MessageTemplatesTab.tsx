"use client";

import { useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import { MessageTemplatePreview } from "@/components/dashboard/settings/MessageTemplatePreview";
import { saveMessageTemplatesSettings } from "@/lib/settings/actions";
import {
  MESSAGE_TEMPLATE_PLACEHOLDERS,
  ORDER_MESSAGE_TEMPLATE_KEYS,
  ORDER_MESSAGE_TEMPLATE_LABELS,
} from "@/lib/orders/message-templates";
import type { MessageTemplatesSettings } from "@/lib/store-settings/types";

interface MessageTemplatesTabProps {
  initialSettings: MessageTemplatesSettings;
  storeName?: string;
}

export function MessageTemplatesTab({
  initialSettings,
  storeName,
}: MessageTemplatesTabProps) {
  const [templates, setTemplates] = useState(initialSettings);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  function handleSave() {
    setError(null);
    setSuccessMessage(null);

    startSave(async () => {
      const result = await saveMessageTemplatesSettings(templates);

      if (result.error) {
        setError(result.error);
        return;
      }

      setSuccessMessage("Plantillas guardadas. Se aplican al enviar WhatsApp desde Pedidos.");
    });
  }

  return (
    <SettingsTabShell
      error={error}
      saving={saving}
      onSave={handleSave}
      saveLabel="Guardar plantillas"
      saveHint="Usa variables como {{cliente}} o {{productos}}. La vista previa se actualiza mientras editas."
    >
      {successMessage ? (
        <p
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
          role="status"
        >
          {successMessage}
        </p>
      ) : null}

      <SettingsSection
        title="Plantillas de mensajes"
        description="Mensajes automáticos de WhatsApp según el estado del pedido. El equipo puede editarlos antes de enviar."
        variant="payments"
      >
        <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
          Variables disponibles:{" "}
          {MESSAGE_TEMPLATE_PLACEHOLDERS.map((token) => (
            <code
              key={token}
              className="mx-0.5 rounded bg-zinc-100 px-1 py-0.5 text-[11px] dark:bg-zinc-900"
            >
              {token}
            </code>
          ))}
        </p>

        <div className="space-y-5">
          {ORDER_MESSAGE_TEMPLATE_KEYS.map((key) => (
            <div key={key} className="general-settings-card">
              <Label htmlFor={`template-${key}`} className="payment-field-label">
                {ORDER_MESSAGE_TEMPLATE_LABELS[key]}
              </Label>

              <div className="mt-3 grid gap-4 lg:grid-cols-2 lg:gap-5">
                <div>
                  <textarea
                    id={`template-${key}`}
                    value={templates[key]}
                    onChange={(event) => {
                      setTemplates((prev) => ({
                        ...prev,
                        [key]: event.target.value,
                      }));
                      setSuccessMessage(null);
                    }}
                    rows={8}
                    className="payment-field-input min-h-[8rem] w-full resize-y font-mono text-sm leading-relaxed"
                    aria-describedby={`template-preview-${key}`}
                  />
                </div>

                <div id={`template-preview-${key}`}>
                  <MessageTemplatePreview
                    template={templates[key]}
                    storeName={storeName}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>
    </SettingsTabShell>
  );
}
