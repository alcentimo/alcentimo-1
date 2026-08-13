"use client";

import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";
import { useDashboardShellMetrics } from "@/components/dashboard/DashboardShellMetrics";

/**
 * Alerta en el panel principal (catálogo) cuando hay pedidos por atender.
 */
export function PendingOrdersAlert() {
  const { pendingOrdersCount } = useDashboardShellMetrics();

  if (pendingOrdersCount <= 0) return null;

  const label =
    pendingOrdersCount === 1
      ? "Tienes 1 pedido nuevo por atender"
      : `Tienes ${pendingOrdersCount} pedidos nuevos por atender`;

  return (
    <div
      className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/50 dark:bg-amber-950/30"
      role="status"
      aria-live="polite"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200">
          <ClipboardList className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
            {label}
          </p>
          <p className="mt-0.5 text-xs text-amber-900/80 dark:text-amber-200/80">
            Revisa pagos, prepara el despacho o actualiza el estado en Órdenes.
          </p>
        </div>
      </div>
      <Link
        href="/dashboard/pedidos"
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-amber-800 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-900 dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-100"
      >
        Ver órdenes
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}
