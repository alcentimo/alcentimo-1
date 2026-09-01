import { formatUsd } from "@/lib/format";
import { estimateNetProfitUsd } from "@/lib/dropship/margin";
import { cn } from "@/lib/cn";

export function DropshipMarginBreakdown({
  costUsd,
  suggestedRetailUsd,
  retailUsd,
  costLabel = "Costo del producto",
  className,
}: {
  costUsd: number;
  suggestedRetailUsd: number | null;
  retailUsd: number | null;
  costLabel?: string;
  className?: string;
}) {
  const salePrice = retailUsd ?? suggestedRetailUsd;
  const profit = estimateNetProfitUsd(salePrice, costUsd);
  const usingSuggestion =
    suggestedRetailUsd != null &&
    retailUsd != null &&
    Math.abs(suggestedRetailUsd - retailUsd) < 0.005;

  return (
    <div
      className={cn(
        "space-y-2 rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/50",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
          {costLabel}
        </span>
        <span className="text-sm font-medium tabular-nums text-zinc-600 dark:text-zinc-300">
          {formatUsd(costUsd)}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
          Precio de venta sugerido
        </span>
        <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {formatUsd(suggestedRetailUsd)}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-3 border-t border-zinc-200/80 pt-2 dark:border-zinc-700/80">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          Ganancia neta estimada
        </span>
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            profit != null && profit > 0
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-zinc-500",
          )}
        >
          {profit != null ? formatUsd(profit) : "—"}
        </span>
      </div>
      {usingSuggestion ? (
        <p className="text-[11px] text-zinc-500">
          Precio comercial rellenado al añadir el producto. Puedes ajustarlo.
        </p>
      ) : null}
    </div>
  );
}
