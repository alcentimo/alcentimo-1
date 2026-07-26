"use client";

import { useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import { MessageTemplatePreview } from "@/components/dashboard/settings/MessageTemplatePreview";
import { MessageTemplateToneAiButton } from "@/components/dashboard/settings/MessageTemplateToneAiButton";
import { saveMessageTemplatesSettings } from "@/lib/settings/actions";
import {
  ORDER_MESSAGE_TEMPLATE_KEYS,
  ORDER_MESSAGE_TEMPLATE_LABELS,
} from "@/lib/orders/message-templates";
import {
  getMessageTemplateAutoFieldsHint,
  toFriendlyMessageTemplate,
  toStorageMessageTemplate,
} from "@/lib/orders/message-template-editor";
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
      saveHint="Edita el texto del mensaje. Los datos del pedido se completan solos al enviar."
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
        description="Mensajes de WhatsApp según el estado del pedido. Redáctalos en lenguaje natural; el sistema inserta nombre, productos y total automáticamente."
        variant="payments"
      >
        <div className="space-y-5">
          {ORDER_MESSAGE_TEMPLATE_KEYS.map((key) => (
            <div key={key} className="general-settings-card">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Label htmlFor={`template-${key}`} className="payment-field-label">
                    {ORDER_MESSAGE_TEMPLATE_LABELS[key]}
                  </Label>
                  <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {getMessageTemplateAutoFieldsHint(key)}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <MessageTemplateToneAiButton
                  templateKey={key}
                  template={templates[key]}
                  disabled={saving}
                  onRewritten={(nextTemplate) => {
                    setTemplates((prev) => ({ ...prev, [key]: nextTemplate }));
                    setSuccessMessage(null);
                  }}
                />
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2 lg:gap-5">
                <div>
                  <textarea
                    id={`template-${key}`}
                    value={toFriendlyMessageTemplate(templates[key])}
                    onChange={(event) => {
                      setTemplates((prev) => ({
                        ...prev,
                        [key]: toStorageMessageTemplate(event.target.value),
                      }));
                      setSuccessMessage(null);
                    }}
                    rows={8}
                    className="payment-field-input min-h-[8rem] w-full resize-y text-sm leading-relaxed"
                    aria-describedby={`template-preview-${key}`}
                    placeholder="Escribe el mensaje que recibirá tu cliente..."
                  />
                  <p className="mt-1.5 text-[10px] text-zinc-400 dark:text-zinc-500">
                    Los recuadros como [Nombre del cliente] se reemplazan solos con
                    los datos reales del pedido.
                  </p>
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
