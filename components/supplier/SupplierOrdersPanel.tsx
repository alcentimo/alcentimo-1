"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, ShoppingBag } from "lucide-react";
import { SupplierEmptyState } from "@/components/supplier/SupplierEmptyState";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { SupplierProduct } from "@/lib/supplier/actions";
import { updateSupplierOrderDispatch } from "@/lib/supplier/order-actions";
import {
  SUPPLIER_HUB_SETTABLE_STATUSES,
  SUPPLIER_ORDER_STATUS_LABELS,
  supplierOrderDispatchUnlocked,
  type SupplierOrder,
  type SupplierOrderStatus,
} from "@/lib/supplier/order-types";
import { SUPPLIER_ORDER_PAYMENT_STATUS_LABELS } from "@/lib/supplier/payment-types";

interface SupplierOrdersPanelProps {
  initialOrders: SupplierOrder[];
  products: SupplierProduct[];
}

type SupplierOrderFilterId = "all" | SupplierOrderStatus;

const FILTER_TABS: { id: SupplierOrderFilterId; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "pendiente", label: "Por preparar" },
  { id: "preparando", label: "Listos para recolección" },
  { id: "despachado", label: "Retirados" },
];

function statusBadgeClass(status: SupplierOrderStatus): string {
  switch (status) {
    case "despachado":
      return "supplier-hub-status-despachado";
    case "preparando":
      return "supplier-hub-status-preparando";
    default:
      return "supplier-hub-status-pendiente";
  }
}

function summarizeProducts(order: SupplierOrder): string {
  if (order.items.length === 0) return "Sin productos";
  return order.items
    .map((item) => `${item.quantity}× ${item.productTitle}`)
    .join(", ");
}

export function SupplierOrdersPanel({
  initialOrders,
}: SupplierOrdersPanelProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] =
    useState<SupplierOrderFilterId>("all");

  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter((order) => order.status === statusFilter);
  }, [orders, statusFilter]);

  const filterCounts = useMemo(() => {
    const counts: Record<SupplierOrderFilterId, number> = {
      all: orders.length,
      pendiente: 0,
      preparando: 0,
      despachado: 0,
    };
    for (const order of orders) {
      counts[order.status] += 1;
    }
    return counts;
  }, [orders]);

  function handleStatusChange(order: SupplierOrder, status: SupplierOrderStatus) {
    if (status === order.status) return;
    setError(null);
    setPendingId(order.id);
    startTransition(async () => {
      const result = await updateSupplierOrderDispatch({
        orderId: order.id,
        status,
        trackingNumber: order.trackingNumber ?? "",
      });
      setPendingId(null);
      if (result.error || !result.order) {
        setError(result.error ?? "No se pudo actualizar.");
        return;
      }
      setOrders((current) =>
        current.map((item) =>
          item.id === result.order!.id ? result.order! : item,
        ),
      );
    });
  }

  return (
    <div className="space-y-5">
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {orders.length === 0 ? (
        <SupplierEmptyState
          icon={ShoppingBag}
          title="Sin órdenes de compra"
          description="Cuando Alcéntimo te solicite surtimiento, el pedido entra aquí. Márcalo listo para recolección; Alcéntimo confirma el retiro."
        />
      ) : (
        <>
          <div
            className="supplier-hub-orders-filters"
            role="tablist"
            aria-label="Filtrar por estado"
          >
            {FILTER_TABS.map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    "supplier-hub-filter-chip",
                    isActive && "supplier-hub-filter-chip-active",
                  )}
                >
                  {tab.label}
                  <span className="supplier-hub-filter-chip-count">
                    {filterCounts[tab.id]}
                  </span>
                </button>
              );
            })}
          </div>

          {filteredOrders.length === 0 ? (
            <SupplierEmptyState
              icon={ShoppingBag}
              title="Nada en este filtro"
              description="No hay órdenes con ese estado. Prueba con Todos para ver el listado completo."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs font-medium text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Producto</th>
                    <th className="px-4 py-2.5 font-medium">A liquidar</th>
                    <th className="px-4 py-2.5 font-medium">Recolección</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredOrders.map((order) => {
                    const saving = pending && pendingId === order.id;
                    const dispatchUnlocked =
                      supplierOrderDispatchUnlocked(order);
                    return (
                      <tr key={order.id} className="bg-white dark:bg-zinc-950">
                        <td className="px-4 py-3 align-middle">
                          <p className="font-medium text-zinc-900 dark:text-zinc-50">
                            {summarizeProducts(order)}
                          </p>
                          <p className="font-mono text-[10px] uppercase text-zinc-400">
                            #{order.id.slice(0, 8)}
                          </p>
                          <p className="mt-1 text-[11px] text-zinc-500">
                            {SUPPLIER_ORDER_PAYMENT_STATUS_LABELS[order.paymentStatus]}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-middle tabular-nums font-medium text-zinc-900 dark:text-zinc-50">
                          {formatUsd(order.totalUsd)}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                            <select
                              className="input-field !mt-0 min-w-[14rem] !py-2 text-xs"
                              value={order.status}
                              disabled={
                                saving ||
                                order.status === "despachado" ||
                                !dispatchUnlocked
                              }
                              aria-label={`Estado de ${summarizeProducts(order)}`}
                              onChange={(event) =>
                                handleStatusChange(
                                  order,
                                  event.target.value as SupplierOrderStatus,
                                )
                              }
                            >
                              {order.status === "despachado" ? (
                                <option value="despachado">
                                  {SUPPLIER_ORDER_STATUS_LABELS.despachado}
                                </option>
                              ) : (
                                SUPPLIER_HUB_SETTABLE_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {SUPPLIER_ORDER_STATUS_LABELS[status]}
                                  </option>
                                ))
                              )}
                            </select>
                            {saving ? (
                              <Loader2
                                className="h-4 w-4 shrink-0 animate-spin text-zinc-400"
                                aria-hidden="true"
                              />
                            ) : (
                              <span
                                className={cn(
                                  "hidden rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline-flex",
                                  statusBadgeClass(order.status),
                                )}
                              >
                                {SUPPLIER_ORDER_STATUS_LABELS[order.status]}
                              </span>
                            )}
                            </div>
                            {!dispatchUnlocked &&
                            order.status !== "despachado" ? (
                              <p className="max-w-xs text-[11px] text-amber-700 dark:text-amber-300">
                                Esperando el pago registrado de Alcéntimo.{" "}
                                <Link
                                  href="/proveedor/dashboard/hub/pagos"
                                  className="font-medium underline-offset-2 hover:underline"
                                >
                                  Ver Pagos
                                </Link>
                              </p>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
