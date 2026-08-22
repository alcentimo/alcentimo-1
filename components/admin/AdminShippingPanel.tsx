"use client";

import { useState, useTransition } from "react";
import { Package } from "lucide-react";
import { ShippingMethodCard } from "@/components/shipping/ShippingMethodCard";
import { SettingsSwitch } from "@/components/ui/SettingsSwitch";
import { updateDropshipShippingSettings } from "@/lib/admin/platform-settings-actions";
import {
  DEFAULT_PLATFORM_DROPSHIP_SHIPPING,
  type PlatformDropshipShippingSettings,
  type PlatformNationalCarrierKey,
} from "@/lib/platform/dropship-shipping";
import { NATIONAL_CARRIER_METHODS } from "@/src/config/shipping-methods";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/cn";

type FreeShippingMode = "off" | "always" | "threshold";

function resolveFreeShippingMode(
  settings: PlatformDropshipShippingSettings,
): FreeShippingMode {
  if (!settings.freeShippingEnabled) return "off";
  if (settings.freeShippingMinUsd <= 0) return "always";
  return "threshold";
}

interface AdminShippingPanelProps {
  initialShipping: PlatformDropshipShippingSettings;
}

export function AdminShippingPanel({
  initialShipping,
}: AdminShippingPanelProps) {
  const [carriers, setCarriers] = useState(initialShipping.carriers);
  const [freeMode, setFreeMode] = useState<FreeShippingMode>(() =>
    resolveFreeShippingMode(initialShipping),
  );
  const [minUsdInput, setMinUsdInput] = useState(() => {
    const min = initialShipping.freeShippingMinUsd;
    return min > 0 ? String(min) : "25";
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function buildPayload(): PlatformDropshipShippingSettings {
    const freeShippingEnabled = freeMode !== "off";
    let freeShippingMinUsd = 0;
    if (freeMode === "threshold") {
      const parsed = Number(minUsdInput.replace(",", "."));
      freeShippingMinUsd =
        Number.isFinite(parsed) && parsed > 0
          ? Math.round(parsed * 100) / 100
          : DEFAULT_PLATFORM_DROPSHIP_SHIPPING.freeShippingMinUsd;
    }

    return {
      carriers,
      pricingMode: "cod",
      flatRateUsd: initialShipping.flatRateUsd,
      freeShippingEnabled,
      freeShippingMinUsd,
    };
  }

  function setCarrier(key: PlatformNationalCarrierKey, value: boolean) {
    setCarriers((current) => ({ ...current, [key]: value }));
    setSuccess(null);
  }

  function handleSave() {
    setError(null);
    setSuccess(null);
    const payload = buildPayload();

    startTransition(async () => {
      const result = await updateDropshipShippingSettings(payload);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.settings?.dropshipShipping) {
        const next = result.settings.dropshipShipping;
        setCarriers(next.carriers);
        setFreeMode(resolveFreeShippingMode(next));
        if (next.freeShippingMinUsd > 0) {
          setMinUsdInput(String(next.freeShippingMinUsd));
        }
      }
      setSuccess("Configuración de envíos guardada. Se aplica en todas las vitrinas.");
    });
  }

  const preview =
    freeMode === "off"
      ? "En checkout: cobro a destino (el cliente paga el flete en la agencia)."
      : freeMode === "always"
        ? `En checkout: ${formatUsd(0)} · Envío gratis a toda Venezuela.`
        : `En checkout: envío gratis desde ${formatUsd(Number(minUsdInput.replace(",", ".")) || 25)}; si no alcanza, cobro a destino.`;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200">
            <Package className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Envíos nacionales (dropship)
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Define agencias y la regla de envío gratis para todas las tiendas.
              Los dropshippers no pueden cambiar estas opciones.
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Agencias nacionales
        </h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Activa al menos MRW o Zoom. Aparecen en el checkout de cada vitrina.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {NATIONAL_CARRIER_METHODS.map((method) => {
            const key = method.key as PlatformNationalCarrierKey;
            return (
              <ShippingMethodCard
                key={key}
                carrierKey={key}
                action={
                  <SettingsSwitch
                    id={`admin-ship-${key}`}
                    label={method.label}
                    checked={carriers[key]}
                    onChange={(v) => setCarrier(key, v)}
                    disabled={pending}
                  />
                }
              />
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Envío gratis global
        </h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Cuando aplica, el checkout muestra {formatUsd(0)} y el texto «Envío
          gratis a toda Venezuela».
        </p>

        <fieldset className="mt-4 space-y-2" disabled={pending}>
          <legend className="sr-only">Modo de envío gratis</legend>
          {(
            [
              {
                id: "off",
                label: "Desactivado",
                hint: "Cobro a destino en agencia (MRW / Zoom).",
              },
              {
                id: "always",
                label: "Siempre gratis",
                hint: "Todos los pedidos nacionales sin costo de envío.",
              },
              {
                id: "threshold",
                label: "A partir de un monto mínimo",
                hint: "Gratis solo si el subtotal de productos alcanza el mínimo.",
              },
            ] as const
          ).map((option) => (
            <label
              key={option.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition",
                freeMode === option.id
                  ? "border-teal-500 bg-teal-50/60 ring-1 ring-teal-500/30 dark:border-teal-400 dark:bg-teal-950/30"
                  : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700",
              )}
            >
              <input
                type="radio"
                name="free-shipping-mode"
                className="mt-1"
                checked={freeMode === option.id}
                onChange={() => {
                  setFreeMode(option.id);
                  setSuccess(null);
                }}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                  {option.hint}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        {freeMode === "threshold" ? (
          <label className="mt-4 block max-w-xs">
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Monto mínimo (USD)
            </span>
            <input
              type="number"
              min={0.01}
              step={0.01}
              inputMode="decimal"
              value={minUsdInput}
              disabled={pending}
              onChange={(e) => {
                setMinUsdInput(e.target.value);
                setSuccess(null);
              }}
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-teal-500/30 focus:border-teal-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>
        ) : null}

        <p className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300">
          {preview}
        </p>
      </section>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          {success}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar envíos"}
        </button>
      </div>
    </div>
  );
}
