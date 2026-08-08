import type { StoreCustomerSummary } from "@/lib/customers/store-customer-stats";

type ProfileRealtimeRow = Record<string, unknown>;

function readString(row: ProfileRealtimeRow, key: string): string | null {
  const value = row[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Mapea un row de customer_profiles (SSR o Realtime) al resumen de Mis Clientes. */
export function mapStoreCustomerSummaryFromProfileRow(
  row: ProfileRealtimeRow,
  stats?: {
    orderCount?: number;
    totalSpentUsd?: number;
    lastOrderAt?: string | null;
  },
): StoreCustomerSummary | null {
  const id = typeof row.id === "string" ? row.id : null;
  const userId = typeof row.user_id === "string" ? row.user_id : null;
  const registeredAt =
    typeof row.created_at === "string" ? row.created_at : null;

  if (!id || !userId || !registeredAt) return null;

  return {
    id,
    userId,
    displayName: readString(row, "display_name"),
    phone: readString(row, "phone"),
    registeredAt,
    orderCount: stats?.orderCount ?? 0,
    totalSpentUsd: stats?.totalSpentUsd ?? 0,
    lastOrderAt: stats?.lastOrderAt ?? null,
  };
}

/** Aplica cambios de contacto desde Realtime conservando stats de pedidos. */
export function patchStoreCustomerSummaryFromProfileRow(
  current: StoreCustomerSummary,
  row: ProfileRealtimeRow,
): StoreCustomerSummary {
  return {
    ...current,
    displayName:
      row.display_name !== undefined
        ? readString(row, "display_name")
        : current.displayName,
    phone:
      row.phone !== undefined ? readString(row, "phone") : current.phone,
    registeredAt:
      typeof row.created_at === "string"
        ? row.created_at
        : current.registeredAt,
  };
}

export function sortStoreCustomersByRecentPurchase(
  customers: StoreCustomerSummary[],
): StoreCustomerSummary[] {
  return [...customers].sort((a, b) => {
    const aTime = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
    const bTime = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
    if (bTime !== aTime) return bTime - aTime;
    return (
      new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()
    );
  });
}
