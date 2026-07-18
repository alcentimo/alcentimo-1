import { createClient } from "@/lib/supabase/server";
import {
  aggregateCustomerOrderStats,
  type StoreCustomerSummary,
} from "@/lib/customers/store-customer-stats";

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

  const statsByUser = aggregateCustomerOrderStats(ordersResult.data ?? []);

  const customers = (profilesResult.data ?? []).map((profile) => {
    const stats = statsByUser.get(profile.user_id);

    return {
      id: profile.id,
      userId: profile.user_id,
      displayName: profile.display_name,
      phone: profile.phone,
      registeredAt: profile.created_at,
      orderCount: stats?.orderCount ?? 0,
      totalSpentUsd: stats?.totalSpentUsd ?? 0,
      lastOrderAt: stats?.lastOrderAt ?? null,
    };
  });

  return sortCustomersByRecentPurchase(customers);
}

function sortCustomersByRecentPurchase(
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

export type { StoreCustomerSummary };
