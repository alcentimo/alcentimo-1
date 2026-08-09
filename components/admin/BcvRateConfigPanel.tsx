"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBcvRateSettings } from "@/lib/admin/platform-settings-actions";
import type { BcvRateMode, PlatformSettings } from "@/lib/platform/platform-settings";
import { formatExchangeRate } from "@/lib/format";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface BcvRateConfigPanelProps {
  initialSettings: PlatformSettings;
  /** Última tasa automática conocida (API / exchange_rate), solo informativa. */
  automaticRateHint?: number | null;
}

export function BcvRateConfigPanel({
  initialSettings,
  automaticRateHint = null,
}: BcvRateConfigPanelProps) {
  const router = useRouter();
  const [mode, setMode] = useState<BcvRateMode>(initialSettings.bcvRateMode);
  const [manualRate, setManualRate] = useState(
    initialSettings.manualBcvRate != null
      ? String(initialSettings.manualBcvRate)
      : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleModeChange(nextMode: BcvRateMode) {
    setMode(nextMode);
    setError(null);
    setSuccess(null);
  }

  function handleSave() {
    setError(null);
    setSuccess(null);

    const parsedRate =
      manualRate.trim() === "" ? null : Number(manualRate.replace(",", "."));

    if (mode === "manual") {
      if (parsedRate == null || !Number.isFinite(parsedRate) || parsedRate <= 0) {
        setError("Ingresa una tasa manual válida mayor que 0.");
        return;
      }
    }

    startTransition(async () => {
      const result = await updateBcvRateSettings({
        mode,
        manualRate: parsedRate,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.settings) {
        setMode(result.settings.bcvRateMode);
        setManualRate(
          result.settings.manualBcvRate != null
            ? String(result.settings.manualBcvRate)
            : "",
        );
      }
      setSuccess(
        mode === "manual"
          ? "Tasa manual activa. Toda la plataforma usará este valor."
          : "Tasa automática activa. Se usará la sincronización BCV por API.",
      );
      router.refresh();
    });
  }

  return (
    <div className="max-w-2xl rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
        Tasa BCV
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Plan de contingencia si la API del BCV falla. En modo manual, catálogos,
        checkout y conversiones usan la tasa que indiques aquí.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Fuente de la tasa
          </p>
          <div
            className="mt-2 grid grid-cols-2 gap-2"
            role="radiogroup"
            aria-label="Fuente de la tasa BCV"
          >
            {(
              [
                ["automatic", "Tasa automática"],
                ["manual", "Tasa manual"],
              ] as const
            ).map(([value, label]) => {
              const selected = mode === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={pending}
                  onClick={() => handleModeChange(value)}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    selected
                      ? "border-teal-600 bg-teal-50 text-teal-900 dark:border-teal-500 dark:bg-teal-950/40 dark:text-teal-100"
                      : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300",
                  )}
                >
                  <span className="font-medium">{label}</span>
                  <span className="mt-0.5 block text-xs opacity-80">
                    {value === "automatic"
                      ? "API BCV (cron / autoheal)"
                      : "Valor fijo del administrador"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {automaticRateHint != null && automaticRateHint > 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Última tasa sincronizada (referencia): Bs.{" "}
            <span className="font-mono tabular-nums text-zinc-700 dark:text-zinc-200">
              {formatExchangeRate(automaticRateHint)}
            </span>
          </p>
        ) : null}

        <div>
          <Label htmlFor="manual-bcv-rate">Tasa manual (Bs. por USD)</Label>
          <Input
            id="manual-bcv-rate"
            name="manualBcvRate"
            type="number"
            inputMode="decimal"
            min={0.01}
            step={0.01}
            value={manualRate}
            onChange={(e) => setManualRate(e.target.value)}
            disabled={pending || mode !== "manual"}
            className="mt-1.5 font-mono tabular-nums"
            placeholder="Ej. 36.50"
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {mode === "manual"
              ? "Obligatoria mientras el modo manual esté activo."
              : "Selecciona «Tasa manual» para editar y activar este valor."}
          </p>
        </div>

        {error ? (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {success && !error ? (
          <p
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
            role="status"
          >
            {success}
          </p>
        ) : null}

        <Button type="button" disabled={pending} onClick={handleSave}>
          {pending ? "Guardando…" : "Guardar configuración de tasa"}
        </Button>
      </div>
    </div>
  );
}
