"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";
import {
  ANALYTICS_RANGE_PRESETS,
  previousPeriodCaption,
} from "@/lib/analytics/date-range";
import type { AnalyticsDateRange, AnalyticsRangePreset } from "@/lib/analytics/types";

interface AnalyticsDateRangePickerProps {
  dateRange: AnalyticsDateRange;
}

function buildAnalyticsUrl(
  preset: AnalyticsRangePreset,
  from?: string,
  to?: string,
): string {
  const params = new URLSearchParams();
  params.set("range", preset);

  if (preset === "custom" && from && to) {
    params.set("from", from);
    params.set("to", to);
  }

  const query = params.toString();
  return query ? `/dashboard/analiticas?${query}` : "/dashboard/analiticas";
}

export function AnalyticsDateRangePicker({ dateRange }: AnalyticsDateRangePickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [customFrom, setCustomFrom] = useState(dateRange.from);
  const [customTo, setCustomTo] = useState(dateRange.to);
  const [showCustom, setShowCustom] = useState(dateRange.preset === "custom");

  const navigate = useCallback(
    (preset: AnalyticsRangePreset, from?: string, to?: string) => {
      startTransition(() => {
        router.push(buildAnalyticsUrl(preset, from, to), { scroll: false });
      });
    },
    [router],
  );

  const handlePresetClick = (preset: AnalyticsRangePreset) => {
    if (preset === "custom") {
      setShowCustom(true);
      return;
    }

    setShowCustom(false);
    navigate(preset);
  };

  const handleCustomApply = () => {
    if (!customFrom || !customTo) return;
    navigate("custom", customFrom, customTo >= customFrom ? customTo : customFrom);
  };

  return (
    <section className="analytics-range-picker" aria-label="Rango de fechas">
      <div className="analytics-range-picker-header">
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Periodo: <strong className="text-zinc-900 dark:text-zinc-100">{dateRange.label}</strong>
          </span>
          <span className="hidden sm:inline">· {previousPeriodCaption(dateRange.preset)}</span>
        </div>
        {isPending ? (
          <span className="analytics-range-picker-loading" aria-live="polite">
            Actualizando…
          </span>
        ) : null}
      </div>

      <div className="analytics-range-presets" role="tablist" aria-label="Periodos predefinidos">
        {ANALYTICS_RANGE_PRESETS.map(({ preset, label }) => {
          const isActive =
            preset === "custom"
              ? dateRange.preset === "custom" || showCustom
              : dateRange.preset === preset && !showCustom;

          return (
            <button
              key={preset}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`analytics-range-preset${isActive ? " analytics-range-preset-active" : ""}`}
              onClick={() => handlePresetClick(preset)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {showCustom || dateRange.preset === "custom" ? (
        <div className="analytics-range-custom">
          <label className="analytics-range-custom-field">
            <span>Desde</span>
            <input
              type="date"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
              max={customTo || undefined}
            />
          </label>
          <label className="analytics-range-custom-field">
            <span>Hasta</span>
            <input
              type="date"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
              min={customFrom || undefined}
            />
          </label>
          <button
            type="button"
            className="analytics-range-custom-apply"
            onClick={handleCustomApply}
            disabled={!customFrom || !customTo || isPending}
          >
            Aplicar
          </button>
        </div>
      ) : null}

      {searchParams.get("range") ? null : (
        <p className="sr-only">Rango predeterminado: este mes</p>
      )}
    </section>
  );
}
