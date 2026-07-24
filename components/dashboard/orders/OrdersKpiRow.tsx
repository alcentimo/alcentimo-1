"use client";

import { Package, ShoppingBag, TrendingUp } from "lucide-react";
import { formatUsd } from "@/lib/format";
import type { OrdersKpiSnapshot } from "@/lib/orders/order-kpis";
import type { OrderFilterId } from "@/lib/orders/order-status";
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard";

interface OrdersKpiRowProps {
  kpis: OrdersKpiSnapshot;
  activeFilter: OrderFilterId;
  onFilterChange: (filter: OrderFilterId) => void;
}

export function OrdersKpiRow({
  kpis,
  activeFilter,
  onFilterChange,
}: OrdersKpiRowProps) {
  return (
    <div className="dashboard-kpi-grid dashboard-kpi-grid-3">
      <DashboardKpiCard
        label="Pedidos hoy"
        value={String(kpis.ordersToday)}
        icon={ShoppingBag}
        interactive
        isActive={activeFilter === "today"}
        onClick={() => onFilterChange("today")}
        emptyHint="Sin pedidos registrados hoy"
      />

      <DashboardKpiCard
        label="Pendientes de despacho"
        value={String(kpis.pendingDispatch)}
        icon={Package}
        interactive
        isActive={activeFilter === "dispatch"}
        onClick={() => onFilterChange("dispatch")}
        tone={kpis.pendingDispatch > 0 && activeFilter !== "dispatch" ? "warning" : "default"}
        emptyHint="Todo al día — nada pendiente"
      />

      <DashboardKpiCard
        label="Volumen de ventas"
        value={formatUsd(kpis.salesVolumeTodayUsd)}
        icon={TrendingUp}
        caption={
          kpis.salesVolumeTodayUsd > 0 ? "Total USD del día" : undefined
        }
        emptyHint="Sin ventas registradas hoy"
      />
    </div>
  );
}
