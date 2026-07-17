import type { CatalogOrder } from "@/lib/orders/types";
import { isDispatchPendingEstado } from "@/lib/orders/order-status";

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
