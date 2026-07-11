"use client";

import { useState, useTransition } from "react";
import { ChannelLogo } from "@/components/inbox/ChannelLogo";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import { SavingHint } from "@/components/dashboard/settings/SavingHint";
import { saveContactSettings } from "@/lib/settings/actions";
import type { ContactSettings } from "@/lib/store-settings/types";
import { normalizeWhatsAppPhone } from "@/lib/catalog/whatsapp-order";

interface GeneralTabProps {
  initialContact: ContactSettings;
}

export function GeneralTab({ initialContact }: GeneralTabProps) {
  const [whatsappPhone, setWhatsappPhone] = useState(initialContact.whatsappPhone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [, startTransition] = useTransition();

  const normalizedPreview = normalizeWhatsAppPhone(whatsappPhone);

  function handleSave() {
    setError(null);
    setSaved(false);
    setSaving(true);

    startTransition(async () => {
      const result = await saveContactSettings({ whatsappPhone: whatsappPhone.trim() });
      setSaving(false);

      if (result.error) {
        setError(result.error);
        setWhatsappPhone(initialContact.whatsappPhone);
        return;
      }

      setSaved(true);
    });
  }

  return (
    <SettingsTabShell
      error={error}
      saveLabel="Guardar contacto"
      saving={saving}
      onSave={handleSave}
    >
      <SettingsSection
        title="WhatsApp para pedidos"
        description="Los clientes usarán este número al finalizar compras desde tu catálogo público."
      >
        <div className="settings-option-card">
          <ChannelLogo provider="whatsapp" className="mb-4 h-11 w-11" />

          <label htmlFor="store-whatsapp" className="label-field">
            Número de WhatsApp
          </label>
          <input
            id="store-whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={whatsappPhone}
            onChange={(e) => {
              setWhatsappPhone(e.target.value);
              setSaved(false);
            }}
            placeholder="Ej: 0414-1234567"
            className="input-field"
          />

          <p className="mt-2 text-sm text-zinc-500">
            Incluye el código de área venezolano. Al guardar, el botón{" "}
            <span className="font-medium text-zinc-700">
              Finalizar pedido por WhatsApp
            </span>{" "}
            dejará de mostrar el aviso y enviará el pedido a este número.
          </p>

          {whatsappPhone.trim() && (
            <p className="mt-3 text-xs text-zinc-400">
              {normalizedPreview
                ? `Se usará el formato internacional: +${normalizedPreview}`
                : "Revisa el número — debe tener al menos 10 dígitos."}
            </p>
          )}

          {saved && !saving && (
            <p className="mt-3 text-sm font-medium text-teal-700">
              WhatsApp guardado correctamente.
            </p>
          )}
          {saving && (
            <div className="mt-3">
              <SavingHint visible />
            </div>
          )}
        </div>
      </SettingsSection>
    </SettingsTabShell>
  );
}
