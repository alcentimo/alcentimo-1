"use client";

import { useMemo, useState } from "react";
import { ArrowRight, RefreshCw, TrendingUp } from "lucide-react";
import {
  formatExchangeRate,
  formatVes,
  roundMoneyDisplay,
} from "@/lib/format";

interface AutomaticConversionWidgetProps {
  rate: number | null;
  updatedAt?: string | null;
  stale?: boolean;
}

const REFERENCE_USD = 100;

function formatSyncTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function AutomaticConversionWidget({
  rate,
  updatedAt,
  stale = false,
}: AutomaticConversionWidgetProps) {
  const [referenceUsd, setReferenceUsd] = useState(String(REFERENCE_USD));

  const parsedUsd = useMemo(() => {
    const normalized = referenceUsd.replace(",", ".").trim();
    const value = Number.parseFloat(normalized);
    return Number.isFinite(value) && value >= 0 ? value : null;
  }, [referenceUsd]);

  const equivalentVes = useMemo(() => {
    if (rate == null || rate <= 0 || parsedUsd == null) return null;
    return roundMoneyDisplay(parsedUsd * rate);
  }, [parsedUsd, rate]);

  const formattedSync = formatSyncTime(updatedAt);

  return (
    <section
      className="fx-conversion-widget"
      aria-labelledby="fx-conversion-title"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#f4f4f5_1px,transparent_1px),linear-gradient(to_bottom,#f4f4f5_1px,transparent_1px)] bg-size-[1.5rem_1.5rem] mask-[linear-gradient(to_bottom,white,transparent)] opacity-60 dark:bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] dark:opacity-30"
        aria-hidden="true"
      />

      <div className="relative p-5 sm:p-6 lg:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p
              id="fx-conversion-title"
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400"
            >
              Conversión automática
            </p>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Motor de precisión BCV aplicado en tiempo real a todo tu catálogo
              y operaciones comerciales.
            </p>
          </div>

          <div
            className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-1 text-xs font-medium ${
              stale
                ? "border-amber-200/80 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
                : "border-emerald-200/80 bg-emerald-50/80 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
            }`}
          >
            <span className="relative flex h-2 w-2">
              {!stale ? (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
              ) : null}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  stale ? "bg-amber-500" : "bg-emerald-500"
                }`}
              />
            </span>
            {stale ? "Actualización automática pendiente" : "Sincronizado · BCV"}
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch lg:gap-4">
          <div className="fx-conversion-panel">
            <label
              htmlFor="fx-reference-usd"
              className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400"
            >
              Referencia USD
            </label>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-sm font-medium text-zinc-400">$</span>
              <input
                id="fx-reference-usd"
                type="text"
                inputMode="decimal"
                value={referenceUsd}
                onChange={(event) => setReferenceUsd(event.target.value)}
                className="fx-mono-value w-full min-w-0 border-0 bg-transparent p-0 text-2xl outline-none ring-0 sm:text-3xl"
                aria-label="Monto de referencia en dólares"
              />
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Base comercial · precios maestros en USD
            </p>
          </div>

          <div className="hidden items-center justify-center lg:flex">
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-zinc-200/80 bg-white text-zinc-400 shadow-[0_1px_2px_rgba(24,24,27,0.04)] dark:border-zinc-700 dark:bg-zinc-900">
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </span>
          </div>

          <div className="fx-conversion-panel border-emerald-100/80 bg-white dark:border-emerald-950/40 dark:bg-zinc-950/60">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
              Equivalente VES
            </p>
            <p className="fx-mono-value mt-2">
              {equivalentVes != null ? formatVes(equivalentVes) : "—"}
            </p>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Calculado con tasa oficial del día
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
              <TrendingUp
                className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span className="font-medium">Tasa oficial</span>
              <span className="font-mono tabular-nums text-zinc-900 dark:text-zinc-50">
                {rate != null
                  ? `Bs. ${formatExchangeRate(rate)} / USD`
                  : "No disponible"}
              </span>
            </div>
            {formattedSync ? (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Actualizada {formattedSync}
              </div>
            ) : null}
          </div>

          <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Los precios en bolívares de tu catálogo se recalculan automáticamente
            al sincronizar la tasa.
          </p>
        </div>
      </div>
    </section>
  );
}
