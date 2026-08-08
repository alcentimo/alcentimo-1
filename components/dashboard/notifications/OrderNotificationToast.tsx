"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { formatUsd } from "@/lib/format";
import type { CatalogOrder } from "@/lib/orders/types";

interface OrderNotificationToastProps {
  order: CatalogOrder;
  onDismiss: () => void;
}

export function OrderNotificationToast({
  order,
  onDismiss,
}: OrderNotificationToastProps) {
  return (
    <div
      className="pointer-events-auto w-[min(100vw-1.5rem,22rem)] overflow-hidden rounded-xl border border-teal-200/80 bg-white/95 shadow-lg shadow-teal-900/10 backdrop-blur-md dark:border-teal-800/60 dark:bg-zinc-900/95 dark:shadow-black/40"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 px-3.5 py-3">
        <span
          className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-teal-500"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
            Nuevo pedido
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {order.customer_name}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {formatUsd(order.total_usd)}
            {order.items.length > 0
              ? ` · ${order.items.length} ítem${order.items.length === 1 ? "" : "s"}`
              : ""}
          </p>
          <Link
            href="/dashboard/pedidos"
            onClick={onDismiss}
            className="mt-2 inline-flex text-xs font-semibold text-teal-700 underline-offset-2 hover:underline dark:text-teal-300"
          >
            Ver en Pedidos
          </Link>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label="Cerrar notificación"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
