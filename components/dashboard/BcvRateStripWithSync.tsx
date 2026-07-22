"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { DashboardExchangeRateBadge } from "@/components/dashboard/DashboardExchangeRateBadge";
import { syncBcvRateManually } from "@/lib/exchange-rate/actions";

interface BcvRateStripWithSyncProps {
  rate: number | null;
  updatedAt?: string | null;
  stale?: boolean;
}

/** Franja BCV con sync manual y auto-reparación si la tasa está desactualizada. */
export function BcvRateStripWithSync({
  rate,
  updatedAt,
  stale = false,
}: BcvRateStripWithSyncProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const autoHealAttempted = useRef(false);

  function runSync(source: "manual" | "auto") {
    setError(null);

    startTransition(async () => {
      const result = await syncBcvRateManually();

      if (result.error) {
        if (source === "manual") {
          setError(result.error);
        }
        return;
      }

      router.refresh();
    });
  }

  useEffect(() => {
    if (!stale || autoHealAttempted.current || pending) return;
    autoHealAttempted.current = true;
    runSync("auto");
  }, [stale, pending]);

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
          onClick={() => runSync("manual")}
          disabled={pending}
          className="btn-brand-outline inline-flex shrink-0 items-center justify-center gap-2 px-4 text-sm sm:self-center"
          aria-label="Sincronizar tasa BCV ahora"
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
      {stale && !error ? (
        <p className="text-xs text-amber-800 dark:text-amber-200/90">
          La tasa lleva más de 26 h sin actualizarse. Puedes sincronizarla ahora;
          el sistema también lo intenta automáticamente.
        </p>
      ) : null}
    </div>
  );
}
