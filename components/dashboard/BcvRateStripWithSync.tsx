import { DashboardExchangeRateBadge } from "@/components/dashboard/DashboardExchangeRateBadge";

interface BcvRateStripReadonlyProps {
  rate: number | null;
  updatedAt?: string | null;
  stale?: boolean;
}

/** Franja informativa de tasa BCV (solo lectura; la sync es automática por cron). */
export function BcvRateStripWithSync({
  rate,
  updatedAt,
  stale = false,
}: BcvRateStripReadonlyProps) {
  return (
    <DashboardExchangeRateBadge
      variant="strip"
      rate={rate}
      updatedAt={updatedAt}
      stale={stale}
    />
  );
}
