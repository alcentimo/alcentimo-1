"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import { formatUsd } from "@/lib/format";
import {
  applySuggestedPriceFromAlert,
  dismissSupplierPriceAlert,
  listUnreadSupplierPriceAlerts,
  type SupplierPriceAlertRow,
} from "@/lib/dropship/actions";

/**
 * Banner de alertas cuando un mayorista cambia el costo de un producto vinculado.
 */
export function SupplierPriceChangeAlertsBanner() {
  const [alerts, setAlerts] = useState<SupplierPriceAlertRow[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    startTransition(async () => {
      const result = await listUnreadSupplierPriceAlerts();
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setAlerts(result.alerts ?? []);
    });
  }

  useEffect(() => {
    refresh();
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div className="mb-4 space-y-2" role="region" aria-label="Alertas de costo mayorista">
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {alerts.slice(0, 5).map((alert) => {
        const up = alert.newCostUsd > alert.oldCostUsd;
        return (
          <div
            key={alert.id}
            className="flex flex-col gap-3 rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/30 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
                  Costo mayorista {up ? "subió" : "bajó"}:{" "}
                  {alert.supplierProductTitle}
                </p>
                <p className="mt-0.5 text-xs text-amber-900/80 dark:text-amber-100/80">
                  {formatUsd(alert.oldCostUsd)} → {formatUsd(alert.newCostUsd)}
                  {alert.suggestedRetailUsd != null
                    ? ` · Precio sugerido ${formatUsd(alert.suggestedRetailUsd)}`
                    : ""}
                  . Las órdenes ya emitidas conservan el costo anterior.
                </p>
                <Link
                  href="/dashboard/ajustes?tab=dropship"
                  className="mt-1 inline-block text-xs font-medium text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-300"
                >
                  Revisar regla de margen
                </Link>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {alert.productId && alert.suggestedRetailUsd != null ? (
                <button
                  type="button"
                  className="btn-brand !min-h-8 !px-3 !text-xs"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await applySuggestedPriceFromAlert(
                        alert.id,
                      );
                      if (result.error) {
                        setError(result.error);
                        return;
                      }
                      setAlerts((current) =>
                        current.filter((row) => row.id !== alert.id),
                      );
                    });
                  }}
                >
                  {pending ? (
                    <Loader2
                      className="mr-1.5 h-3.5 w-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  Aplicar sugerido
                </button>
              ) : null}
              <button
                type="button"
                className="btn-brand-outline !min-h-8 !px-3 !text-xs"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await dismissSupplierPriceAlert(alert.id);
                    if (result.error) {
                      setError(result.error);
                      return;
                    }
                    setAlerts((current) =>
                      current.filter((row) => row.id !== alert.id),
                    );
                  });
                }}
              >
                <X className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Descartar
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
