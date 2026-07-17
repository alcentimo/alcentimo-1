"use client";

import { Package, ShoppingBag, TrendingUp } from "lucide-react";
import { formatUsd } from "@/lib/format";
import type { OrdersKpiSnapshot } from "@/lib/orders/order-kpis";
import type { OrderFilterId } from "@/lib/orders/order-status";
import { cn } from "@/lib/cn";

interface OrdersKpiRowProps {
  kpis: OrdersKpiSnapshot;
  activeFilter: OrderFilterId;
  onFilterChange: (filter: OrderFilterId) => void;
}

const KPI_FILTERS: {
  id: OrderFilterId;
  label: string;
  icon: typeof ShoppingBag;
  getValue: (kpis: OrdersKpiSnapshot) => string;
  tone?: "default" | "warning";
}[] = [
  {
    id: "today",
    label: "Pedidos hoy",
    icon: ShoppingBag,
    getValue: (kpis) => String(kpis.ordersToday),
  },
  {
    id: "dispatch",
    label: "Pendientes de despacho",
    icon: Package,
    getValue: (kpis) => String(kpis.pendingDispatch),
    tone: "warning",
  },
];

export function OrdersKpiRow({
  kpis,
  activeFilter,
  onFilterChange,
}: OrdersKpiRowProps) {
  return (
    <div className="orders-ops-kpi-grid">
      {KPI_FILTERS.map(({ id, label, icon: Icon, getValue, tone = "default" }) => {
        const isActive = activeFilter === id;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onFilterChange(id)}
            className={cn(
              "orders-ops-kpi-card text-left transition-shadow",
              isActive && "orders-ops-kpi-card-active",
              tone === "warning" && kpis.pendingDispatch > 0 && !isActive
                ? "orders-ops-kpi-card-warning"
                : "",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {label}
              </p>
              <span className="orders-ops-kpi-icon" aria-hidden="true">
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {getValue(kpis)}
            </p>
          </button>
        );
      })}

      <div className="orders-ops-kpi-card">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Volumen de ventas
          </p>
          <span className="orders-ops-kpi-icon" aria-hidden="true">
            <TrendingUp className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-3 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {formatUsd(kpis.salesVolumeTodayUsd)}
        </p>
        <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
          Total USD del día
        </p>
      </div>
    </div>
  );
}
