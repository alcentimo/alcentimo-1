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
      className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${
        stale
          ? "border-amber-300/80 bg-amber-50 text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-200"
          : "border-zinc-200/80 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400"
      }`}
      aria-label="Tasa del día"
      title={
        stale
          ? "La tasa lleva más de 24 h sin actualizarse. Revisa los logs del cron BCV."
          : undefined
      }
    >
      <span className={`font-medium ${stale ? "text-amber-950 dark:text-amber-100" : "text-zinc-700 dark:text-zinc-300"}`}>
        {stale ? "Tasa desactualizada" : "Tasa del día"}
      </span>
      <span className={stale ? "text-amber-700/70 dark:text-amber-300/70" : "text-zinc-300 dark:text-zinc-600"} aria-hidden="true">
        ·
      </span>
      <span>
        {rate != null ? (
          <>Bs. {formatExchangeRate(rate)} / USD</>
        ) : (
          "Sin tasa disponible"
        )}
      </span>
      {formattedDate ? (
        <>
          <span className={`hidden sm:inline ${stale ? "text-amber-700/70 dark:text-amber-300/70" : "text-zinc-300 dark:text-zinc-600"}`} aria-hidden="true">
            ·
          </span>
          <span className={`hidden sm:inline ${stale ? "text-amber-800/90 dark:text-amber-200/90" : "text-zinc-500"}`}>
            {stale ? "Última sync" : "Actualizada"} {formattedDate}
          </span>
        </>
      ) : null}
    </div>
  );
}
