"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateDropshipShippingSettings } from "@/lib/admin/platform-settings-actions";
import type { PlatformSettings } from "@/lib/platform/platform-settings";
import type {
  PlatformDropshipShippingSettings,
  PlatformNationalCarrierKey,
} from "@/lib/platform/dropship-shipping";
import { ShippingMethodCard } from "@/components/shipping/ShippingMethodCard";
import { SettingsSwitch } from "@/components/ui/SettingsSwitch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUsd } from "@/lib/format";
import { NATIONAL_CARRIER_METHODS } from "@/src/config/shipping-methods";

interface DropshipShippingConfigPanelProps {
  initialSettings: PlatformSettings;
}

export function DropshipShippingConfigPanel({
  initialSettings,
}: DropshipShippingConfigPanelProps) {
  const router = useRouter();
  const [carriers, setCarriers] = useState(
    initialSettings.dropshipShipping.carriers,
  );
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(
    initialSettings.dropshipShipping.freeShippingEnabled,
  );
  const [freeShippingMinUsd, setFreeShippingMinUsd] = useState(
    String(initialSettings.dropshipShipping.freeShippingMinUsd),
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function parseAmount(value: string, fallback: number): number {
    const parsed = Number(value.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return Math.round(parsed * 100) / 100;
  }

  function buildPayload(): PlatformDropshipShippingSettings {
    return {
      carriers,
      pricingMode: "cod",
      flatRateUsd: initialSettings.dropshipShipping.flatRateUsd,
      freeShippingEnabled,
      freeShippingMinUsd: parseAmount(
        freeShippingMinUsd,
        initialSettings.dropshipShipping.freeShippingMinUsd,
      ),
    };
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
      if (result.settings) {
        setCarriers(result.settings.dropshipShipping.carriers);
        setFreeShippingEnabled(result.settings.dropshipShipping.freeShippingEnabled);
        setFreeShippingMinUsd(
          String(result.settings.dropshipShipping.freeShippingMinUsd),
        );
      }
      setSuccess(
        "Reglas de envío guardadas. Se aplican a todas las vitrinas dropship.",
      );
      router.refresh();
    });
  }

  const freeMinPreview = parseAmount(
    freeShippingMinUsd,
    initialSettings.dropshipShipping.freeShippingMinUsd,
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Envíos dropship (global)
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Estas reglas salen automáticas en el checkout de cada dropshipper.
          Ellos no configuran agencias ni envío gratis.
        </p>

        <div className="mt-5 rounded-xl border border-teal-500 bg-teal-50/70 p-4 ring-1 ring-teal-500/30 dark:border-teal-400 dark:bg-teal-950/30">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Cobro a destino
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
            El cliente paga el flete en la agencia (MRW, Zoom, etc.) al retirar
            el paquete. No se suma al total del pedido, salvo que actives envío
            gratis por monto mínimo.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Agencias nacionales
        </h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Activa las oficinas que verá el comprador en todas las vitrinas.
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
                    id={`platform-ship-${key}`}
                    label={method.label}
                    checked={carriers[key]}
                    onChange={(value) =>
                      setCarriers((current) => ({ ...current, [key]: value }))
                    }
                    disabled={pending}
                  />
                }
              />
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Envío gratis condicionado
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Si el carrito alcanza el mínimo, el checkout muestra “Gratis” en
              lugar de cobro a destino.
            </p>
          </div>
          <SettingsSwitch
            id="platform-free-shipping"
            label="Envío gratis condicionado"
            checked={freeShippingEnabled}
            onChange={setFreeShippingEnabled}
            disabled={pending}
          />
        </div>

        {freeShippingEnabled ? (
          <div className="mt-4 max-w-xs space-y-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <Label htmlFor="platform-free-shipping-min">
              Monto mínimo de compra (USD)
            </Label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-400">
                $
              </span>
              <Input
                id="platform-free-shipping-min"
                type="number"
                min="1"
                step="0.01"
                inputMode="decimal"
                value={freeShippingMinUsd}
                onChange={(event) => setFreeShippingMinUsd(event.target.value)}
                className="pl-7"
                placeholder="25"
                disabled={pending}
              />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Ejemplo: envío gratis desde {formatUsd(Math.max(freeMinPreview, 1))}.
            </p>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-teal-700 dark:text-teal-300">{success}</p>
      ) : null}

      <Button type="button" onClick={handleSave} disabled={pending}>
        {pending ? "Guardando…" : "Guardar envíos globales"}
      </Button>
    </div>
  );
}
