import { cn } from "@/lib/cn";
import { DashboardExchangeRateBadge } from "@/components/dashboard/DashboardExchangeRateBadge";
import { DashboardPreferenceControls } from "@/components/dashboard/DashboardPreferenceControls";

interface DashboardQuickUtilitiesProps {
  exchangeRate?: number | null;
  exchangeRateUpdatedAt?: string | null;
  exchangeRateStale?: boolean;
  className?: string;
}

/** Tasa BCV y cambio de tema: visibles en móvil y escritorio. */
export function DashboardQuickUtilities({
  exchangeRate = null,
  exchangeRateUpdatedAt = null,
  exchangeRateStale = false,
  className,
}: DashboardQuickUtilitiesProps) {
  return (
    <div className={cn("flex flex-nowrap items-center gap-1.5 sm:gap-2", className)}>
      <DashboardPreferenceControls variant="compact" />
      <DashboardExchangeRateBadge
        rate={exchangeRate}
        updatedAt={exchangeRateUpdatedAt}
        stale={exchangeRateStale}
      />
    </div>
  );
}
