import { cn } from "@/lib/cn";

interface WholesalePriceBadgeProps {
  className?: string;
  compact?: boolean;
}

export function WholesalePriceBadge({
  className,
  compact = false,
}: WholesalePriceBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-emerald-100 font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className,
      )}
    >
      ¡Precio al mayor aplicado!
    </span>
  );
}

export function WholesaleCatalogHint({
  wholesalePriceUsd,
  wholesaleMinQty,
  className,
}: {
  wholesalePriceUsd: number;
  wholesaleMinQty: number;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[11px] font-medium text-emerald-700 dark:text-emerald-400",
        className,
      )}
    >
      Mayorista desde {wholesaleMinQty} u.
    </p>
  );
}
