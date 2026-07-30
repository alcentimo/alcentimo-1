"use client";

import { DashboardExchangeRateBadge } from "@/components/dashboard/DashboardExchangeRateBadge";

interface BcvRateStripWithSyncProps {
  rate: number | null;
  updatedAt?: string | null;
  stale?: boolean;
}

/**
 * Franja BCV informativa.
 * El auto-heal vive en el layout (`ensureBcvRateFreshForToday`).
 * No llamar aquí a `syncBcvRateManually`: revalidatePath + remount
 * dejaba /dashboard/catalogo en bucle de loading.
 */
export function BcvRateStripWithSync({
  rate,
  updatedAt,
  stale = false,
}: BcvRateStripWithSyncProps) {
  return (
    <div className="space-y-2">
      <DashboardExchangeRateBadge
        variant="strip"
        rate={rate}
        updatedAt={updatedAt}
        stale={stale}
      />
      {stale ? (
        <p className="text-xs text-amber-800 dark:text-amber-200/90">
          La tasa lleva más de 26 h sin actualizarse. Se actualizará sola en
          segundo plano; puedes seguir trabajando en el catálogo.
        </p>
      ) : null}
    </div>
  );
}
