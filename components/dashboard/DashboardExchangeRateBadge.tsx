import { formatExchangeRate } from "@/lib/format";

interface DashboardExchangeRateBadgeProps {
  rate: number | null;
  updatedAt?: string | null;
  stale?: boolean;
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
}: DashboardExchangeRateBadgeProps) {
  const formattedDate = formatUpdatedAt(updatedAt);

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
