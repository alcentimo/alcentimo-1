"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { DashboardExchangeRateBadge } from "@/components/dashboard/DashboardExchangeRateBadge";
import { syncBcvRateManually } from "@/lib/exchange-rate/actions";

interface BcvRateStripWithSyncProps {
  rate: number | null;
  updatedAt?: string | null;
  stale?: boolean;
}

export function BcvRateStripWithSync({
  rate,
  updatedAt,
  stale = false,
}: BcvRateStripWithSyncProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSync() {
    setError(null);

    startTransition(async () => {
      const result = await syncBcvRateManually();

      if (result.error) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
        <div className="min-w-0 flex-1">
          <DashboardExchangeRateBadge
            variant="strip"
            rate={rate}
            updatedAt={updatedAt}
            stale={stale}
          />
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={pending}
          className="btn-brand-outline inline-flex shrink-0 items-center justify-center gap-2 px-4 text-sm sm:self-center"
        >
          <RefreshCw
            className={`h-4 w-4 ${pending ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          {pending ? "Sincronizando…" : "Sincronizar tasa"}
        </button>
      </div>
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
