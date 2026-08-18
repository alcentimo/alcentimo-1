import { cn } from "@/lib/cn";
import { DashboardExchangeRateBadge } from "@/components/dashboard/DashboardExchangeRateBadge";

interface DashboardQuickUtilitiesProps {
  exchangeRate?: number | null;
  exchangeRateUpdatedAt?: string | null;
  className?: string;
}

/** Tasa BCV (automática). */
export function DashboardQuickUtilities({
  exchangeRate = null,
  exchangeRateUpdatedAt = null,
  className,
}: DashboardQuickUtilitiesProps) {
  return (
    <div className={cn("flex min-w-0 max-w-full flex-wrap items-center gap-1.5 sm:gap-2", className)}>
      <DashboardExchangeRateBadge
        rate={exchangeRate}
        updatedAt={exchangeRateUpdatedAt}
      />
    </div>
  );
}
