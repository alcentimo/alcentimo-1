import type { BcvSyncAlert } from "@/lib/exchange-rate/get-bcv-sync-alert";

interface BcvSyncAlertBannerProps {
  alert: BcvSyncAlert;
}

export function BcvSyncAlertBanner({ alert }: BcvSyncAlertBannerProps) {
  return (
    <div className="alert-warning mb-6" role="alert">
      <p className="font-medium text-amber-950 dark:text-amber-100">{alert.message}</p>
      {alert.detail ? (
        <p className="mt-1.5 text-sm text-amber-900/90 dark:text-amber-200/90">
          {alert.detail}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-amber-800/80 dark:text-amber-300/80">
        Fecha afectada: {alert.syncDate}. Ejecuta{" "}
        <code className="rounded bg-amber-100/80 px-1 py-0.5 dark:bg-amber-950/60">
          npm run sync:bcv-rate
        </code>{" "}
        o revisa logs en{" "}
        <code className="rounded bg-amber-100/80 px-1 py-0.5 dark:bg-amber-950/60">
          tasas_cambio_sync_logs
        </code>{" "}
        (Supabase) y{" "}
        <code className="rounded bg-amber-100/80 px-1 py-0.5 dark:bg-amber-950/60">
          Vercel → Cron /api/cron/sync-bcv-rate
        </code>
        .
      </p>
    </div>
  );
}
