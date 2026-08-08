import { createClient } from "@/lib/supabase/server";
import {
  mapStoreCustomerSummaryFromProfileRow,
  sortStoreCustomersByRecentPurchase,
} from "@/lib/customers/store-customer-shared";
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

  const customers = (profilesResult.data ?? [])
    .map((profile) => {
      const stats = statsByUser.get(profile.user_id);
      return mapStoreCustomerSummaryFromProfileRow(
        profile as Record<string, unknown>,
        {
          orderCount: stats?.orderCount ?? 0,
          totalSpentUsd: stats?.totalSpentUsd ?? 0,
          lastOrderAt: stats?.lastOrderAt ?? null,
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

  const [profileResult, ordersResult] = await Promise.all([
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
    },
  );
}

export type { StoreCustomerSummary };
