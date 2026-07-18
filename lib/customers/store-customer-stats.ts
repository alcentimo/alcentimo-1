export interface StoreCustomerSummary {
  id: string;
  userId: string;
  displayName: string | null;
  phone: string | null;
  registeredAt: string;
  orderCount: number;
  totalSpentUsd: number;
  lastOrderAt: string | null;
}

interface OrderAggregateRow {
  customer_user_id: string | null;
  total_usd: number | string;
  created_at: string;
}

export function aggregateCustomerOrderStats(
  orders: OrderAggregateRow[],
): Map<string, { orderCount: number; totalSpentUsd: number; lastOrderAt: string }> {
  const map = new Map<
    string,
    { orderCount: number; totalSpentUsd: number; lastOrderAt: string }
  >();

  for (const order of orders) {
    const userId = order.customer_user_id;
    if (!userId) continue;

    const total = Number(order.total_usd) || 0;
    const existing = map.get(userId);

    if (!existing) {
      map.set(userId, {
        orderCount: 1,
        totalSpentUsd: total,
        lastOrderAt: order.created_at,
      });
      continue;
    }

    existing.orderCount += 1;
    existing.totalSpentUsd += total;
    if (order.created_at > existing.lastOrderAt) {
      existing.lastOrderAt = order.created_at;
    }
  }

  return map;
}
