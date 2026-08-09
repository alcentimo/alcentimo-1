"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updatePlatformSettings } from "@/lib/admin/platform-settings-actions";
import type { PlatformSettings } from "@/lib/platform/platform-settings";
import { BcvRateConfigPanel } from "@/components/admin/BcvRateConfigPanel";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PlatformSettingsConfigPanelProps {
  initialSettings: PlatformSettings;
  automaticRateHint?: number | null;
}

export function PlatformSettingsConfigPanel({
  initialSettings,
  automaticRateHint = null,
}: PlatformSettingsConfigPanelProps) {
  const router = useRouter();
  const [platformName, setPlatformName] = useState(initialSettings.platformName);
  const [tagline, setTagline] = useState(initialSettings.tagline);
  const [supportEmail, setSupportEmail] = useState(
    initialSettings.supportEmail ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.set("platformName", platformName);
    formData.set("tagline", tagline);
    formData.set("supportEmail", supportEmail);

    startTransition(async () => {
      const result = await updatePlatformSettings(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.settings) {
        setPlatformName(result.settings.platformName);
        setTagline(result.settings.tagline);
        setSupportEmail(result.settings.supportEmail ?? "");
      }
      setSuccess("Datos de la plataforma guardados.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <BcvRateConfigPanel
        initialSettings={initialSettings}
        automaticRateHint={automaticRateHint}
      />

      <div className="max-w-2xl rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Identidad de la plataforma
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Configura los datos de Alcentimo. Los cambios se reflejan en la
          landing, login, panel y catálogos públicos.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Configuración general
          </h3>

          <div>
            <Label htmlFor="platform-name">Nombre de la plataforma</Label>
            <Input
              id="platform-name"
              name="platformName"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              required
              disabled={pending}
              className="mt-1.5"
              placeholder="Alcentimo"
              autoComplete="off"
            />
          </div>

          <div>
            <Label htmlFor="platform-tagline">Descripción corta</Label>
            <Input
              id="platform-tagline"
              name="tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              required
              disabled={pending}
              className="mt-1.5"
              placeholder="Inventario y catálogo digital"
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Aparece como subtítulo en el panel y en metadatos del sitio.
            </p>
          </div>

          <div>
            <Label htmlFor="platform-support-email">Correo de soporte</Label>
            <Input
              id="platform-support-email"
              name="supportEmail"
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              disabled={pending}
              className="mt-1.5"
              placeholder="soporte@alcentimo.com"
              autoComplete="off"
            />
          </div>

          {error && (
            <p
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
              role="alert"
            >
              {error}
            </p>
          )}

          {success && !error && (
            <p
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
              role="status"
            >
              {success}
            </p>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar datos de la plataforma"}
          </Button>
        </form>
      </div>
    </div>
  );
}
