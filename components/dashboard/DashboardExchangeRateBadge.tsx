import { formatExchangeRate } from "@/lib/format";

interface DashboardExchangeRateBadgeProps {
  rate: number | null;
  updatedAt?: string | null;
  /** @deprecated Ignorado: la tasa se actualiza sola; no se alerta al comerciante. */
  stale?: boolean;
  variant?: "badge" | "strip" | "compact";
}

function formatUpdatedAt(value: string | null | undefined): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** Indicador transparente de la tasa BCV vigente (actualización automática diaria). */
export function DashboardExchangeRateBadge({
  rate,
  updatedAt,
  variant = "badge",
}: DashboardExchangeRateBadgeProps) {
  const formattedDate = formatUpdatedAt(updatedAt);
  const rateLabel =
    rate != null ? `Bs. ${formatExchangeRate(rate)}` : "Sin tasa";
  const syncLabel = "Actualizada automáticamente";

  if (variant === "strip") {
    return (
      <div
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-zinc-200/70 bg-white px-4 py-2.5 text-sm text-zinc-600 shadow-sm shadow-emerald-500/5 dark:border-zinc-800/70 dark:bg-zinc-950/60 dark:text-zinc-400"
        role="status"
        aria-label={`Tasa BCV ${rateLabel}. ${syncLabel}.${
          formattedDate ? ` Última actualización ${formattedDate}.` : ""
        }`}
      >
        <p className="min-w-0 text-pretty">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Tasa BCV:
          </span>{" "}
          <span className="font-mono tabular-nums text-zinc-900 dark:text-zinc-50">
            {rateLabel}
          </span>
          {formattedDate ? (
            <span className="text-zinc-500 dark:text-zinc-400">
              {" "}
              · Actualizada {formattedDate}
            </span>
          ) : null}
        </p>
        <span className="inline-flex shrink-0 items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          {syncLabel}
        </span>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className="flex w-full items-center justify-between gap-2 text-[11px] leading-none text-zinc-600 dark:text-zinc-400"
        role="status"
        aria-label={`Tasa BCV ${rateLabel}. ${syncLabel}.${
          formattedDate ? ` Última actualización ${formattedDate}.` : ""
        }`}
        title={
          formattedDate
            ? `Actualizada automáticamente · ${formattedDate}`
            : "Tasa BCV actualizada automáticamente"
        }
      >
        <span className="min-w-0 truncate">
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            Tasa BCV
          </span>
          <span className="mx-1.5 text-zinc-300 dark:text-zinc-600" aria-hidden="true">
            ·
          </span>
          <span className="font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
            {rateLabel}
          </span>
        </span>
        <span
          className="relative flex h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div
      className="dashboard-exchange-rate-badge flex shrink-0 items-center gap-2 rounded-[10px] border border-zinc-200/70 bg-white px-2 py-1 text-[10px] text-zinc-600 shadow-[0_1px_2px_rgba(24,24,27,0.03)] sm:px-3 sm:py-1.5 sm:text-xs dark:border-zinc-800/70 dark:bg-zinc-900/50 dark:text-zinc-400"
      aria-label={`Tasa BCV ${rateLabel}`}
      title={
        formattedDate
          ? `Actualizada automáticamente · ${formattedDate}`
          : "Tasa BCV actualizada automáticamente"
      }
    >
      <span className="font-medium text-zinc-700 dark:text-zinc-300">BCV</span>
      <span className="text-zinc-300 dark:text-zinc-600" aria-hidden="true">
        ·
      </span>
      <span className="font-mono tabular-nums">
        {rate != null ? <>Bs. {formatExchangeRate(rate)}</> : "Sin tasa"}
      </span>
      {formattedDate ? (
        <>
          <span
            className="hidden text-zinc-300 sm:inline dark:text-zinc-600"
            aria-hidden="true"
          >
            ·
          </span>
          <span className="hidden text-zinc-500 sm:inline">{formattedDate}</span>
        </>
      ) : null}
    </div>
  );
}
