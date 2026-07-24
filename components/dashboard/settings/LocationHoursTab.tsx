"use client";

import { useState, useTransition } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";
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
import { MAX_WHATSAPP_PHONES, WEEKDAY_KEYS } from "@/lib/store-settings/types";

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

function initialPhones(contact: ContactSettings): string[] {
  const phones = (contact.whatsappPhones ?? [])
    .map((phone) => phone.trim())
    .filter(Boolean);
  if (phones.length > 0) return phones.slice(0, MAX_WHATSAPP_PHONES);
  const legacy = contact.whatsappPhone.trim();
  return legacy ? [legacy] : [""];
}

export function LocationHoursTab({
  initialLocationHours,
  initialContact,
}: LocationHoursTabProps) {
  const [locationHours, setLocationHours] = useState(initialLocationHours);
  const [whatsappPhones, setWhatsappPhones] = useState(() =>
    initialPhones(initialContact),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [, startTransition] = useTransition();

  function updateDay(
    key: WeekdayKey,
    patch: Partial<LocationHoursSettings["schedule"][WeekdayKey]>,
  ) {
    setLocationHours((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [key]: {
          ...prev.schedule[key],
          ...patch,
        },
      },
    }));
    setSuccess(false);
  }

  function setPhoneAt(index: number, value: string) {
    setWhatsappPhones((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setSuccess(false);
  }

  function addPhone() {
    if (whatsappPhones.length >= MAX_WHATSAPP_PHONES) return;
    setWhatsappPhones((prev) => [...prev, ""]);
    setSuccess(false);
  }

  function removePhone(index: number) {
    setWhatsappPhones((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [""];
    });
    setSuccess(false);
  }

  function handleSave() {
    setError(null);
    setSuccess(false);

    const cleanedPhones = whatsappPhones
      .map((phone) => phone.trim())
      .filter(Boolean);

    for (const phone of cleanedPhones) {
      if (!normalizeWhatsAppPhone(phone)) {
        setError(
          "Revisa los números de WhatsApp — cada uno debe tener al menos 10 dígitos.",
        );
        return;
      }
    }

    if (cleanedPhones.length > MAX_WHATSAPP_PHONES) {
      setError(`Puedes configurar hasta ${MAX_WHATSAPP_PHONES} números de WhatsApp.`);
      return;
    }

    setSaving(true);

    startTransition(async () => {
      const result = await saveLocationHoursSettings({
        locationHours,
        whatsappPhones: cleanedPhones,
        whatsappPhone: cleanedPhones[0] ?? "",
      });
      setSaving(false);

      if (result.error) {
        setError(result.error);
        setLocationHours(initialLocationHours);
        setWhatsappPhones(initialPhones(initialContact));
        return;
      }

      setWhatsappPhones(cleanedPhones.length > 0 ? cleanedPhones : [""]);
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
        description="Configura apertura y cierre de forma independiente para cada día."
        variant="payments"
      >
        <div className="general-settings-card space-y-2">
          {WEEKDAY_KEYS.map((key) => {
            const day = locationHours.schedule[key];
            const enabled = day.enabled;

            return (
              <div
                key={key}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3",
                  enabled
                    ? "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/40"
                    : "border-zinc-100 bg-zinc-50/80 dark:border-zinc-900 dark:bg-zinc-950/20",
                )}
              >
                <button
                  type="button"
                  onClick={() => updateDay(key, { enabled: !enabled })}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:w-28",
                    enabled
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : "border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400",
                  )}
                  aria-pressed={enabled}
                >
                  {WEEKDAY_LABELS[key]}
                </button>

                <div className="grid flex-1 grid-cols-2 gap-2">
                  <div>
                    <Label
                      htmlFor={`open-${key}`}
                      className="payment-field-label text-[11px]"
                    >
                      Apertura
                    </Label>
                    <Input
                      id={`open-${key}`}
                      type="time"
                      disabled={!enabled}
                      value={day.openTime}
                      onChange={(e) =>
                        updateDay(key, { openTime: e.target.value })
                      }
                      className="payment-field-input mt-1"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor={`close-${key}`}
                      className="payment-field-label text-[11px]"
                    >
                      Cierre
                    </Label>
                    <Input
                      id={`close-${key}`}
                      type="time"
                      disabled={!enabled}
                      value={day.closeTime}
                      onChange={(e) =>
                        updateDay(key, { closeTime: e.target.value })
                      }
                      className="payment-field-input mt-1"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        title="WhatsApp para pedidos"
        description={`Hasta ${MAX_WHATSAPP_PHONES} números. El primero se usa como principal en el catálogo y checkout.`}
        variant="payments"
      >
        <div className="general-settings-card space-y-3">
          <ChannelLogo provider="whatsapp" className="h-7 w-7" />

          {whatsappPhones.map((phone, index) => {
            const normalized = normalizeWhatsAppPhone(phone);
            return (
              <div key={`wa-${index}`} className="space-y-1.5">
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Label
                      htmlFor={`store-whatsapp-${index}`}
                      className="payment-field-label"
                    >
                      {index === 0
                        ? "WhatsApp principal"
                        : `WhatsApp adicional ${index}`}
                    </Label>
                    <Input
                      id={`store-whatsapp-${index}`}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhoneAt(index, e.target.value)}
                      placeholder="Ej: 0414-1234567"
                      className="payment-field-input mt-1.5"
                    />
                  </div>
                  {whatsappPhones.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removePhone(index)}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-red-600 dark:border-zinc-800 dark:hover:bg-zinc-900 dark:hover:text-red-400"
                      aria-label={`Eliminar WhatsApp ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
                {phone.trim() ? (
                  <p className="text-[11px] text-zinc-400">
                    {normalized
                      ? `Formato internacional: +${normalized}`
                      : "Revisa el número — debe tener al menos 10 dígitos."}
                  </p>
                ) : null}
              </div>
            );
          })}

          {whatsappPhones.length < MAX_WHATSAPP_PHONES ? (
            <button
              type="button"
              onClick={addPhone}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Agregar otro WhatsApp
            </button>
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
