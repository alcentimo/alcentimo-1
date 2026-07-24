"use client";

import { useState, useTransition } from "react";
import { MapPin } from "lucide-react";
import { ChannelLogo } from "@/components/inbox/ChannelLogo";
import { SavingHint } from "@/components/dashboard/settings/SavingHint";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";
import { normalizeWhatsAppPhone } from "@/lib/catalog/whatsapp-order";
import { saveLocationHoursSettings } from "@/lib/settings/actions";
import type {
  ContactSettings,
  LocationHoursSettings,
  WeekdayKey,
} from "@/lib/store-settings/types";
import { WEEKDAY_KEYS } from "@/lib/store-settings/types";

const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  mon: "Lunes",
  tue: "Martes",
  wed: "Miércoles",
  thu: "Jueves",
  fri: "Viernes",
  sat: "Sábado",
  sun: "Domingo",
};

interface LocationHoursTabProps {
  initialLocationHours: LocationHoursSettings;
  initialContact: ContactSettings;
}

export function LocationHoursTab({
  initialLocationHours,
  initialContact,
}: LocationHoursTabProps) {
  const [locationHours, setLocationHours] = useState(initialLocationHours);
  const [whatsappPhone, setWhatsappPhone] = useState(initialContact.whatsappPhone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [, startTransition] = useTransition();

  const normalizedWhatsapp = normalizeWhatsAppPhone(whatsappPhone);

  function toggleDay(key: WeekdayKey, enabled: boolean) {
    setLocationHours((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [key]: { enabled },
      },
    }));
    setSuccess(false);
  }

  function handleSave() {
    setError(null);
    setSuccess(false);
    setSaving(true);

    startTransition(async () => {
      const result = await saveLocationHoursSettings({
        locationHours,
        whatsappPhone,
      });
      setSaving(false);

      if (result.error) {
        setError(result.error);
        setLocationHours(initialLocationHours);
        setWhatsappPhone(initialContact.whatsappPhone);
        return;
      }

      setSuccess(true);
    });
  }

  return (
    <SettingsTabShell
      error={error}
      saveLabel="Guardar ubicación y horario"
      saving={saving}
      onSave={handleSave}
      saveHint="Esta información se muestra en tu catálogo y checkout."
    >
      {success && (
        <p
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
          role="status"
        >
          Ubicación y horario guardados correctamente.
        </p>
      )}

      <SettingsSection
        title="País de operación"
        description="Alcentimo opera actualmente en Venezuela."
        variant="payments"
      >
        <div className="general-settings-card flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Venezuela
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Moneda local: Bolívares (Bs.)
            </p>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Ubicación"
        description="Opcional para negocios 100% online. Ciudad y referencia que verán tus clientes; no es obligatoria para configurar entregas en zonas."
        variant="payments"
      >
        <div className="general-settings-card space-y-3">
          <div>
            <Label htmlFor="store-city" className="payment-field-label">
              Ciudad
            </Label>
            <Input
              id="store-city"
              value={locationHours.city}
              onChange={(e) => {
                setLocationHours((prev) => ({ ...prev, city: e.target.value }));
                setSuccess(false);
              }}
              placeholder="Ej: Valencia, Caracas, Maracaibo"
              className="payment-field-input mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="store-address" className="payment-field-label">
              Dirección o referencia
            </Label>
            <textarea
              id="store-address"
              rows={2}
              value={locationHours.address}
              onChange={(e) => {
                setLocationHours((prev) => ({ ...prev, address: e.target.value }));
                setSuccess(false);
              }}
              placeholder="Ej: Av. Bolívar, Centro Comercial X, Local 12"
              className="input-field payment-field-textarea mt-1.5 resize-none"
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Horario de atención"
        description="Días y horas en los que atiendes pedidos o recibes clientes."
        variant="payments"
      >
        <div className="general-settings-card space-y-4">
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_KEYS.map((key) => {
              const enabled = locationHours.schedule[key].enabled;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleDay(key, !enabled)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    enabled
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : "border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400",
                  )}
                  aria-pressed={enabled}
                >
                  {WEEKDAY_LABELS[key]}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="open-time" className="payment-field-label">
                Hora de apertura
              </Label>
              <Input
                id="open-time"
                type="time"
                value={locationHours.openTime}
                onChange={(e) => {
                  setLocationHours((prev) => ({ ...prev, openTime: e.target.value }));
                  setSuccess(false);
                }}
                className="payment-field-input mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="close-time" className="payment-field-label">
                Hora de cierre
              </Label>
              <Input
                id="close-time"
                type="time"
                value={locationHours.closeTime}
                onChange={(e) => {
                  setLocationHours((prev) => ({ ...prev, closeTime: e.target.value }));
                  setSuccess(false);
                }}
                className="payment-field-input mt-1.5"
              />
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="WhatsApp para pedidos"
        description="Número al que llegan los pedidos del catálogo."
        variant="payments"
      >
        <div className="general-settings-card">
          <ChannelLogo provider="whatsapp" className="mb-2.5 h-7 w-7" />
          <Label htmlFor="store-whatsapp" className="payment-field-label">
            Número de WhatsApp
          </Label>
          <Input
            id="store-whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={whatsappPhone}
            onChange={(e) => {
              setWhatsappPhone(e.target.value);
              setSuccess(false);
            }}
            placeholder="Ej: 0414-1234567"
            className="payment-field-input mt-1.5"
          />
          {whatsappPhone.trim() ? (
            <p className="mt-2 text-[11px] text-zinc-400">
              {normalizedWhatsapp
                ? `Formato internacional: +${normalizedWhatsapp}`
                : "Revisa el número — debe tener al menos 10 dígitos."}
            </p>
          ) : null}
        </div>
      </SettingsSection>

      {saving && (
        <div className="mt-2">
          <SavingHint visible />
        </div>
      )}
    </SettingsTabShell>
  );
}
