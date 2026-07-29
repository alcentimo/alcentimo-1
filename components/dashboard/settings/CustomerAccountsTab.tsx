"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import { SavingHint } from "@/components/dashboard/settings/SavingHint";
import { saveCheckoutSettings } from "@/lib/settings/actions";
import type {
  CheckoutSettings,
  CustomerAccountMode,
} from "@/lib/store-settings/types";
import { cn } from "@/lib/cn";

interface CustomerAccountsTabProps {
  initialSettings: CheckoutSettings;
}

const MODE_OPTIONS: {
  id: CustomerAccountMode;
  title: string;
  description: string;
  bullets: string[];
}[] = [
  {
    id: "libre",
    title: "Modo libre",
    description:
      "Los clientes compran como invitados. No ven opciones de crear cuenta ni iniciar sesión.",
    bullets: [
      "Checkout solo con datos de contacto o envío",
      "Sin registro obligatorio ni opcional en la tienda",
      "Ideal si priorizas velocidad y cero fricción",
    ],
  },
  {
    id: "hibrido",
    title: "Modo híbrido / cuentas",
    description:
      "Permite comprar como invitado y, si quieren, registrarse o iniciar sesión.",
    bullets: [
      "Cuenta opcional con teléfono o correo + contraseña",
      "Sin códigos SMS ni costos de verificación",
      "Pueden guardar historial y datos para la próxima compra",
    ],
  },
];

export function CustomerAccountsTab({
  initialSettings,
}: CustomerAccountsTabProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function selectMode(accountMode: CustomerAccountMode) {
    if (accountMode === settings.accountMode) return;

    const previous = settings.accountMode;
    const next = { ...settings, accountMode };
    setSettings(next);
    setError(null);
    setSaving(true);

    startTransition(async () => {
      const result = await saveCheckoutSettings(next);
      setSaving(false);

      if (result.error) {
        setError(result.error);
        setSettings((prev) => ({ ...prev, accountMode: previous }));
      }
    });
  }

  return (
    <SettingsTabShell error={error} hideSaveBar>
      <SettingsSection
        title="Modo de clientes"
        description="Elige cómo funciona el registro en tu catálogo público. En ambos modos el cliente puede comprar sin crear cuenta."
        variant="payments"
      >
        <div className="space-y-3">
          {MODE_OPTIONS.map((option) => {
            const selected = settings.accountMode === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => selectMode(option.id)}
                disabled={saving}
                aria-pressed={selected}
                className={cn(
                  "w-full rounded-2xl border p-4 text-left transition",
                  selected
                    ? "border-zinc-900 bg-zinc-50 shadow-sm dark:border-zinc-100 dark:bg-zinc-900/60"
                    : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                      {option.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {option.description}
                    </p>
                    <ul className="mt-3 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-300">
                      {option.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                      selected
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-300 text-transparent dark:border-zinc-700",
                    )}
                    aria-hidden="true"
                  >
                    <Check className="h-4 w-4" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {saving ? (
          <div className="mt-4">
            <SavingHint visible />
          </div>
        ) : null}
      </SettingsSection>
    </SettingsTabShell>
  );
}
