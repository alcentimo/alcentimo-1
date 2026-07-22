"use client";

import { useState, useTransition, type FormEvent } from "react";
import { updatePlanSettings } from "@/lib/admin/plan-settings-actions";
import {
  DEFAULT_PLAN_SETTINGS,
  type PlanSettingRow,
  type PlanSettingsKey,
  type PlanSettingsMap,
} from "@/lib/plans/plan-settings";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PLAN_ORDER: PlanSettingsKey[] = ["FREE", "PRO", "BUSINESS", "ENTERPRISE"];

function limitToInput(value: number | null): string {
  return value == null ? "" : String(value);
}

function PlanCard({
  planKey,
  row,
  onChange,
  disabled,
}: {
  planKey: PlanSettingsKey;
  row: PlanSettingRow;
  onChange: (next: PlanSettingRow) => void;
  disabled: boolean;
}) {
  const prefix = planKey.toLowerCase();
  const isFree = planKey === "FREE";
  const isEnterprise = planKey === "ENTERPRISE";

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
        {row.displayName}
        <span className="ml-2 text-xs font-medium text-zinc-400">{planKey}</span>
      </h3>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor={`${prefix}-name`}>Nombre visible</Label>
          <Input
            id={`${prefix}-name`}
            name={`${prefix}_displayName`}
            value={row.displayName}
            onChange={(e) =>
              onChange({ ...row, displayName: e.target.value })
            }
            disabled={disabled}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor={`${prefix}-monthly`}>Precio mensual (USD)</Label>
          <Input
            id={`${prefix}-monthly`}
            name={`${prefix}_monthlyUsd`}
            type="number"
            min={0}
            step="0.01"
            value={row.monthlyUsd}
            onChange={(e) =>
              onChange({
                ...row,
                monthlyUsd: Number(e.target.value || 0),
              })
            }
            disabled={disabled}
            readOnly={isFree}
            className="mt-1.5"
            required
          />
        </div>

        <div>
          <Label htmlFor={`${prefix}-annual`}>Precio anual (USD)</Label>
          <Input
            id={`${prefix}-annual`}
            name={`${prefix}_annualUsd`}
            type="number"
            min={0}
            step="0.01"
            value={row.annualUsd ?? ""}
            onChange={(e) =>
              onChange({
                ...row,
                annualUsd: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            disabled={disabled || isFree}
            readOnly={isFree}
            className="mt-1.5"
            placeholder={isFree ? "No aplica" : "Ej. 75"}
            required={!isFree}
          />
        </div>

        <div>
          <Label htmlFor={`${prefix}-products`}>Límite de productos</Label>
          <Input
            id={`${prefix}-products`}
            name={`${prefix}_productLimit`}
            type="number"
            min={1}
            step={1}
            value={limitToInput(row.productLimit)}
            onChange={(e) =>
              onChange({
                ...row,
                productLimit:
                  e.target.value.trim() === ""
                    ? null
                    : Number(e.target.value),
              })
            }
            disabled={disabled}
            className="mt-1.5"
            placeholder="Vacío = ilimitado"
          />
          <p className="mt-1 text-xs text-zinc-400">
            Déjalo vacío para productos ilimitados.
          </p>
        </div>

        <div>
          <Label htmlFor={`${prefix}-users`}>Límite de usuarios (opcional)</Label>
          <Input
            id={`${prefix}-users`}
            name={`${prefix}_userLimit`}
            type="number"
            min={1}
            step={1}
            value={limitToInput(row.userLimit)}
            onChange={(e) =>
              onChange({
                ...row,
                userLimit:
                  e.target.value.trim() === ""
                    ? null
                    : Number(e.target.value),
              })
            }
            disabled={disabled}
            className="mt-1.5"
            placeholder="Vacío = sin límite"
          />
        </div>

        <div>
          <Label htmlFor={`${prefix}-locations`}>Sucursales incluidas</Label>
          <Input
            id={`${prefix}-locations`}
            name={`${prefix}_includedLocations`}
            type="number"
            min={1}
            max={20}
            step={1}
            value={row.includedLocations}
            onChange={(e) =>
              onChange({
                ...row,
                includedLocations: Math.max(1, Number(e.target.value || 1)),
              })
            }
            disabled={disabled}
            className="mt-1.5"
            required
          />
        </div>

        {isEnterprise ? (
          <div>
            <Label htmlFor={`${prefix}-extra-loc`}>
              Precio sede extra (USD/mes)
            </Label>
            <Input
              id={`${prefix}-extra-loc`}
              name={`${prefix}_extraLocationMonthlyUsd`}
              type="number"
              min={0}
              step="0.01"
              value={row.extraLocationMonthlyUsd}
              onChange={(e) =>
                onChange({
                  ...row,
                  extraLocationMonthlyUsd: Number(e.target.value || 0),
                })
              }
              disabled={disabled}
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-zinc-400">
              Se muestra en la tarjeta de precios como add-on.
            </p>
          </div>
        ) : (
          <input
            type="hidden"
            name={`${prefix}_extraLocationMonthlyUsd`}
            value={row.extraLocationMonthlyUsd}
            readOnly
          />
        )}
      </div>
    </div>
  );
}

interface PlanSettingsConfigPanelProps {
  initialSettings: PlanSettingsMap;
}

export function PlanSettingsConfigPanel({
  initialSettings,
}: PlanSettingsConfigPanelProps) {
  const [settings, setSettings] = useState<PlanSettingsMap>(
    initialSettings ?? DEFAULT_PLAN_SETTINGS,
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updatePlanSettings(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.settings) {
        setSettings(result.settings);
      }
      setSuccess(
        "Planes actualizados. Precios, límites y sedes ya se reflejan en Activa tu cuenta.",
      );
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
        Los cambios se guardan en <code className="text-xs">plan_settings</code>{" "}
        y se muestran de inmediato en las pantallas de suscripción. Enterprise
        controla sucursales incluidas y el precio del add-on por sede extra.
      </div>

      <div className="grid gap-4 lg:grid-cols-1">
        {PLAN_ORDER.map((key) => (
          <PlanCard
            key={key}
            planKey={key}
            row={settings[key]}
            disabled={pending}
            onChange={(next) =>
              setSettings((prev) => ({ ...prev, [key]: next }))
            }
          />
        ))}
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          {success}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="btn-brand">
        {pending ? "Guardando…" : "Guardar planes"}
      </Button>
    </form>
  );
}
