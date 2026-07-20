import { formatExchangeRate } from "@/lib/format";

interface DashboardExchangeRateBadgeProps {
  rate: number | null;
  updatedAt?: string | null;
  stale?: boolean;
  variant?: "badge" | "strip";
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

export function DashboardExchangeRateBadge({
  rate,
  updatedAt,
  stale = false,
  variant = "badge",
}: DashboardExchangeRateBadgeProps) {
  const formattedDate = formatUpdatedAt(updatedAt);
  const rateLabel =
    rate != null ? `Bs. ${formatExchangeRate(rate)}` : "Sin tasa";
  const syncLabel = stale
    ? "Actualización automática pendiente"
    : "Actualizada automáticamente";

  if (variant === "strip") {
    return (
      <div
        className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border px-4 py-2.5 text-sm shadow-sm ${
          stale
            ? "border-amber-200/80 bg-amber-50/70 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200"
            : "border-zinc-200/70 bg-white text-zinc-600 shadow-emerald-500/5 dark:border-zinc-800/70 dark:bg-zinc-950/60 dark:text-zinc-400"
        }`}
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
        <span
          className={`inline-flex shrink-0 items-center gap-2 text-xs font-medium ${
            stale
              ? "text-amber-800 dark:text-amber-200"
              : "text-emerald-700 dark:text-emerald-400"
          }`}
        >
          <span className="relative flex h-2 w-2" aria-hidden="true">
            {!stale ? (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
            ) : null}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                stale ? "bg-amber-500" : "bg-emerald-500"
              }`}
            />
          </span>
          {syncLabel}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center gap-2 rounded-[10px] border px-3 py-1.5 text-xs ${
        stale
          ? "border-amber-200/80 bg-amber-50/90 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
          : "border-zinc-200/70 bg-white text-zinc-600 shadow-[0_1px_2px_rgba(24,24,27,0.03)] dark:border-zinc-800/70 dark:bg-zinc-900/50 dark:text-zinc-400"
      }`}
      aria-label="Tasa del día"
      title={
        stale
          ? "La tasa lleva más de 24 h sin actualizarse."
          : undefined
      }
    >
      <span
        className={`font-medium ${stale ? "text-amber-950 dark:text-amber-100" : "text-zinc-700 dark:text-zinc-300"}`}
      >
        {stale ? "Tasa desactualizada" : "BCV"}
      </span>
      <span
        className={
          stale
            ? "text-amber-700/60 dark:text-amber-300/60"
            : "text-zinc-300 dark:text-zinc-600"
        }
        aria-hidden="true"
      >
        ·
      </span>
      <span className="font-mono tabular-nums">
        {rate != null ? (
          <>Bs. {formatExchangeRate(rate)}</>
        ) : (
          "Sin tasa"
        )}
      </span>
      {formattedDate && !stale ? (
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
