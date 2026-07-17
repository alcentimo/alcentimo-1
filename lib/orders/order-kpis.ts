import type { CatalogOrder } from "@/lib/orders/types";
import {
  isDispatchPendingEstado,
  sortOrdersByBusinessRules,
} from "@/lib/orders/order-status";

const VENEZUELA_TZ = "America/Caracas";

function formatDateInVenezuela(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VENEZUELA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isOrderToday(order: CatalogOrder, reference = new Date()): boolean {
  const today = formatDateInVenezuela(reference);
  const orderDay = formatDateInVenezuela(new Date(order.created_at));
  return orderDay === today;
}

export interface OrdersKpiSnapshot {
  ordersToday: number;
  pendingDispatch: number;
  salesVolumeTodayUsd: number;
}

export interface OrderDayGroup<T extends CatalogOrder = CatalogOrder> {
  id: "today" | "older";
  label: string;
  orders: T[];
}

/** Agrupa pedidos activos en Hoy / Días anteriores (orden lógico dentro de cada grupo). */
export function groupActiveOrdersByDay(
  orders: CatalogOrder[],
): OrderDayGroup[] {
  const today = sortOrdersByBusinessRules(orders.filter((order) => isOrderToday(order)));
  const older = sortOrdersByBusinessRules(
    orders.filter((order) => !isOrderToday(order)),
  );

  const groups: OrderDayGroup[] = [];

  if (today.length > 0) {
    groups.push({ id: "today", label: "Hoy", orders: today });
  }

  if (older.length > 0) {
    groups.push({ id: "older", label: "Días anteriores", orders: older });
  }

  return groups;
}

export function computeOrdersKpis(orders: CatalogOrder[]): OrdersKpiSnapshot {
  let ordersToday = 0;
  let pendingDispatch = 0;
  let salesVolumeTodayUsd = 0;

  for (const order of orders) {
    if (isDispatchPendingEstado(order.estado)) {
      pendingDispatch += 1;
    }

    if (!isOrderToday(order)) continue;

    ordersToday += 1;

    if (order.estado !== "cancelado") {
      salesVolumeTodayUsd += order.total_usd;
    }
  }

  return {
    ordersToday,
    pendingDispatch,
    salesVolumeTodayUsd,
  };
}
