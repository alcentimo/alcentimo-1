import { createClient } from "@/lib/supabase/server";
import {
  mapStoreCustomerSummaryFromProfileRow,
  sortStoreCustomersByRecentPurchase,
} from "@/lib/customers/store-customer-shared";
import {
  aggregateCustomerOrderStats,
  type StoreCustomerSummary,
} from "@/lib/customers/store-customer-stats";

/** Máxima `last_seen_at` por usuario autenticado en visitas al catálogo. */
async function fetchLastCatalogVisitByUserId(
  storeId: string,
  userIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (userIds.length === 0) return map;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catalog_visits")
    .select("user_id, last_seen_at")
    .eq("store_id", storeId)
    .in("user_id", userIds)
    .not("user_id", "is", null);

  if (error || !data) {
    // Display-only: si falla la lectura, la lista de clientes sigue operativa.
    return map;
  }

  for (const row of data) {
    const userId = typeof row.user_id === "string" ? row.user_id : null;
    const lastSeen =
      typeof row.last_seen_at === "string" ? row.last_seen_at : null;
    if (!userId || !lastSeen) continue;

    const existing = map.get(userId);
    if (!existing || lastSeen > existing) {
      map.set(userId, lastSeen);
    }
  }

  return map;
}

export async function getStoreCustomers(
  storeId: string,
): Promise<StoreCustomerSummary[]> {
  const supabase = await createClient();

  const [profilesResult, ordersResult] = await Promise.all([
    supabase
      .from("customer_profiles")
      .select("id, user_id, display_name, phone, created_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("customer_user_id, total_usd, created_at")
      .eq("store_id", storeId)
      .not("customer_user_id", "is", null),
  ]);

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }
  if (ordersResult.error) {
    throw new Error(ordersResult.error.message);
  }

  const profiles = profilesResult.data ?? [];
  const statsByUser = aggregateCustomerOrderStats(ordersResult.data ?? []);
  const visitByUser = await fetchLastCatalogVisitByUserId(
    storeId,
    profiles.map((profile) => profile.user_id).filter(Boolean),
  );

  const customers = profiles
    .map((profile) => {
      const stats = statsByUser.get(profile.user_id);
      return mapStoreCustomerSummaryFromProfileRow(
        profile as Record<string, unknown>,
        {
          orderCount: stats?.orderCount ?? 0,
          totalSpentUsd: stats?.totalSpentUsd ?? 0,
          lastOrderAt: stats?.lastOrderAt ?? null,
          lastCatalogVisitAt: visitByUser.get(profile.user_id) ?? null,
        },
      );
    })
    .filter((customer): customer is StoreCustomerSummary => Boolean(customer));

  return sortStoreCustomersByRecentPurchase(customers);
}

export async function getStoreCustomerByUserId(
  storeId: string,
  customerUserId: string,
): Promise<StoreCustomerSummary | null> {
  const normalizedUserId = customerUserId.trim();
  if (!normalizedUserId) return null;

  const supabase = await createClient();

  const [profileResult, ordersResult, visitByUser] = await Promise.all([
    supabase
      .from("customer_profiles")
      .select("id, user_id, display_name, phone, created_at")
      .eq("store_id", storeId)
      .eq("user_id", normalizedUserId)
      .maybeSingle(),
    supabase
      .from("orders")
      .select("customer_user_id, total_usd, created_at")
      .eq("store_id", storeId)
      .eq("customer_user_id", normalizedUserId),
    fetchLastCatalogVisitByUserId(storeId, [normalizedUserId]),
  ]);

  if (profileResult.error || !profileResult.data) {
    return null;
  }

  if (ordersResult.error) {
    throw new Error(ordersResult.error.message);
  }

  const statsByUser = aggregateCustomerOrderStats(ordersResult.data ?? []);
  const stats = statsByUser.get(normalizedUserId);

  return mapStoreCustomerSummaryFromProfileRow(
    profileResult.data as Record<string, unknown>,
    {
      orderCount: stats?.orderCount ?? 0,
      totalSpentUsd: stats?.totalSpentUsd ?? 0,
      lastOrderAt: stats?.lastOrderAt ?? null,
      lastCatalogVisitAt: visitByUser.get(normalizedUserId) ?? null,
    },
  );
}

export type { StoreCustomerSummary };
