import { cn } from "@/lib/cn";
import { DashboardExchangeRateBadge } from "@/components/dashboard/DashboardExchangeRateBadge";
import { DashboardPreferenceControls } from "@/components/dashboard/DashboardPreferenceControls";

interface DashboardQuickUtilitiesProps {
  exchangeRate?: number | null;
  exchangeRateUpdatedAt?: string | null;
  /** Si false, solo muestra el control de tema (p. ej. header móvil). */
  showExchangeRate?: boolean;
  className?: string;
}

/** Tasa BCV (automática) y cambio de tema. */
export function DashboardQuickUtilities({
  exchangeRate = null,
  exchangeRateUpdatedAt = null,
  showExchangeRate = true,
  className,
}: DashboardQuickUtilitiesProps) {
  return (
    <div className={cn("flex flex-nowrap items-center gap-1.5 sm:gap-2", className)}>
      <DashboardPreferenceControls />
      {showExchangeRate ? (
        <DashboardExchangeRateBadge
          rate={exchangeRate}
          updatedAt={exchangeRateUpdatedAt}
        />
      ) : null}
    </div>
  );
}
