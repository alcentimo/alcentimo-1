"use client";

import { useMemo, useState, useTransition } from "react";
import { ShoppingBag } from "lucide-react";
import { SupplierEmptyState } from "@/components/supplier/SupplierEmptyState";
import { SupplierIncomingPayoutCard } from "@/components/supplier/SupplierIncomingPayoutCard";
import { cn } from "@/lib/cn";
import type { SupplierPayoutObligationView } from "@/lib/dropship/settlement-types";
import type { SupplierProduct } from "@/lib/supplier/actions";
import { updateSupplierOrderDispatch } from "@/lib/supplier/order-actions";
import {
  type SupplierOrder,
  type SupplierOrderStatus,
} from "@/lib/supplier/order-types";

interface SupplierOrdersPanelProps {
  initialOrders: SupplierOrder[];
  products: SupplierProduct[];
  payouts?: SupplierPayoutObligationView[];
}

type SupplierOrderFilterId = "all" | SupplierOrderStatus;

const FILTER_TABS: { id: SupplierOrderFilterId; label: string }[] = [
  { id: "pendiente", label: "Por preparar" },
  { id: "preparando", label: "Listos para retirar" },
  { id: "despachado", label: "Retirados" },
  { id: "all", label: "Todos" },
];

function payoutForOrder(
  order: SupplierOrder,
  payouts: SupplierPayoutObligationView[],
): SupplierPayoutObligationView | null {
  if (!order.settlementId) return null;
  return (
    payouts.find((payout) => payout.settlementId === order.settlementId) ?? null
  );
}

export function SupplierOrdersPanel({
  initialOrders,
  payouts = [],
}: SupplierOrdersPanelProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] =
    useState<SupplierOrderFilterId>("pendiente");

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
          title="Sin pedidos"
          description="Cuando Alcéntimo compre, aparecerán aquí."
        />
      ) : (
        <>
          <div
            className="supplier-hub-orders-filters"
            role="tablist"
            aria-label="Estado del pedido"
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
              title="Sin pedidos"
              description=""
            />
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <SupplierIncomingPayoutCard
                  key={order.id}
                  order={order}
                  payout={payoutForOrder(order, payouts)}
                  saving={pending && pendingId === order.id}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
