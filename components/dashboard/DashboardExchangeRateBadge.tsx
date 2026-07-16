import { formatExchangeRate } from "@/lib/format";

interface DashboardExchangeRateBadgeProps {
  rate: number | null;
  updatedAt?: string | null;
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
}: DashboardExchangeRateBadgeProps) {
  const formattedDate = formatUpdatedAt(updatedAt);

  return (
    <div
      className="flex shrink-0 items-center gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400"
      aria-label="Tasa del día"
    >
      <span className="font-medium text-zinc-700 dark:text-zinc-300">Tasa del día</span>
      <span className="text-zinc-300 dark:text-zinc-600" aria-hidden="true">
        ·
      </span>
      <span>
        {rate != null ? (
          <>
            Bs. {formatExchangeRate(rate)} / USD
          </>
        ) : (
          "Sin tasa disponible"
        )}
      </span>
      {formattedDate ? (
        <>
          <span className="hidden text-zinc-300 dark:text-zinc-600 sm:inline" aria-hidden="true">
            ·
          </span>
          <span className="hidden text-zinc-500 sm:inline">Actualizada {formattedDate}</span>
        </>
      ) : null}
    </div>
  );
}
