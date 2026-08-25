"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, MapPin, Truck } from "lucide-react";
import {
  listAdminSupplierPickupOrders,
  markSupplierOrderCollectedByAlcentimo,
  type AdminSupplierPickupOrder,
} from "@/lib/admin/supplier-pickup-actions";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/cn";

export function AdminSupplierPickupPanel() {
  const [orders, setOrders] = useState<AdminSupplierPickupOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void listAdminSupplierPickupOrders().then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOrders(result.orders ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleCollect(order: AdminSupplierPickupOrder) {
    setError(null);
    setPendingId(order.id);
    startTransition(async () => {
      const result = await markSupplierOrderCollectedByAlcentimo({
        orderId: order.id,
      });
      setPendingId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOrders((current) => current.filter((item) => item.id !== order.id));
    });
  }

  return (
    <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
          <Truck className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Recolección B2B
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            El dropshipper vende, el proveedor marca listo, y Alcéntimo confirma
            el retiro en el almacén.
          </p>
        </div>
      </div>

      {error ? (
        <p className="mb-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="inline-flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Cargando pedidos de recolección…
        </p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No hay pedidos pendientes o listos para recolección.
        </p>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const saving = pending && pendingId === order.id;
            const ready = order.status === "preparando";
            return (
              <li
                key={order.id}
                className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {order.companyName}
                    </p>
                    <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-300">
                      {order.productSummary}
                    </p>
                    <p className="mt-1 inline-flex items-start gap-1.5 text-xs text-zinc-500">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {order.warehouseAddress || "Sin dirección de almacén"}
                      {order.pickupHours
                        ? ` · ${order.pickupHours}`
                        : " · Sin horarios de retiro"}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase text-zinc-400">
                      #{order.id.slice(0, 8)} · {formatUsd(order.totalUsd)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        ready
                          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                          : "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
                      )}
                    >
                      {order.statusLabel}
                    </span>
                    <button
                      type="button"
                      className="btn-brand-outline !min-h-8 !px-3 !text-xs"
                      disabled={saving || !ready}
                      onClick={() => handleCollect(order)}
                    >
                      {saving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Marcar retirado"
                      )}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
