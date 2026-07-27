"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DashboardExchangeRateBadge } from "@/components/dashboard/DashboardExchangeRateBadge";
import { syncBcvRateManually } from "@/lib/exchange-rate/actions";

interface BcvRateStripWithSyncProps {
  rate: number | null;
  updatedAt?: string | null;
  stale?: boolean;
}

/** Franja BCV informativa; la tasa se repara en segundo plano si está desactualizada. */
export function BcvRateStripWithSync({
  rate,
  updatedAt,
  stale = false,
}: BcvRateStripWithSyncProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const autoHealAttempted = useRef(false);

  useEffect(() => {
    if (!stale || autoHealAttempted.current || pending) return;
    autoHealAttempted.current = true;

    startTransition(async () => {
      const result = await syncBcvRateManually();
      if (!result.error) {
        router.refresh();
      }
    });
  }, [stale, pending, router]);

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
          La tasa lleva más de 26 h sin actualizarse. El sistema la actualizará
          automáticamente en segundo plano.
        </p>
      ) : null}
    </div>
  );
}
