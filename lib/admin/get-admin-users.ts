import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeDbPlan } from "@/lib/plans/plan-activation";
import type { ProfilePlanDb } from "@/lib/database.types";

export interface AdminUserRow {
  id: string;
  email: string | null;
  plan: ProfilePlanDb;
  subscriptionStatus: string;
  productCount: number;
  storeCount: number;
  periodEndsAt: string | null;
  createdAt: string | null;
}

export interface AdminUserFilters {
  plan?: ProfilePlanDb | "all";
  minProducts?: number;
  maxProducts?: number;
  search?: string;
  limit?: number;
}

/** Lista usuarios con conteo de productos activos de sus tiendas. */
export async function getAdminUsers(
  filters: AdminUserFilters = {},
): Promise<AdminUserRow[]> {
  const admin = createAdminClient();
  const limit = Math.min(Math.max(filters.limit ?? 200, 1), 500);

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, plan, subscription_status, subscription_period_ends_at")
    .limit(2000);

  if (error) throw new Error(error.message);

  const profileIds = (profiles ?? []).map((p) => p.id);
  if (profileIds.length === 0) return [];

  const { data: stores, error: storesError } = await admin
    .from("stores")
    .select("id, owner_id")
    .in("owner_id", profileIds);

  if (storesError) throw new Error(storesError.message);

  const storeIds = (stores ?? []).map((s) => s.id);
  const ownerByStore = new Map(
    (stores ?? []).map((s) => [s.id, s.owner_id] as const),
  );

  const productCountByOwner = new Map<string, number>();
  const storeCountByOwner = new Map<string, number>();

  for (const store of stores ?? []) {
    storeCountByOwner.set(
      store.owner_id,
      (storeCountByOwner.get(store.owner_id) ?? 0) + 1,
    );
  }

  if (storeIds.length > 0) {
    const { data: products, error: productsError } = await admin
      .from("products")
      .select("store_id")
      .in("store_id", storeIds)
      .eq("is_active", true)
      .eq("is_deleted", false);

    if (productsError) throw new Error(productsError.message);

    for (const product of products ?? []) {
      const ownerId = ownerByStore.get(product.store_id);
      if (!ownerId) continue;
      productCountByOwner.set(
        ownerId,
        (productCountByOwner.get(ownerId) ?? 0) + 1,
      );
    }
  }

  const emailById = new Map<string, string | null>();
  // Batch auth lookups in chunks (Auth Admin has no bulk by ids helper here).
  for (let i = 0; i < profileIds.length; i += 40) {
    const chunk = profileIds.slice(i, i + 40);
    await Promise.all(
      chunk.map(async (id) => {
        try {
          const { data } = await admin.auth.admin.getUserById(id);
          emailById.set(id, data.user?.email ?? null);
        } catch {
          emailById.set(id, null);
        }
      }),
    );
  }

  const planFilter = filters.plan && filters.plan !== "all" ? filters.plan : null;
  const search = filters.search?.trim().toLowerCase() ?? "";
  const minProducts = filters.minProducts;
  const maxProducts = filters.maxProducts;

  const rows: AdminUserRow[] = [];

  for (const profile of profiles ?? []) {
    const plan = normalizeDbPlan(profile.plan);
    const productCount = productCountByOwner.get(profile.id) ?? 0;
    const email = emailById.get(profile.id) ?? null;

    if (planFilter && plan !== planFilter) continue;
    if (minProducts != null && productCount < minProducts) continue;
    if (maxProducts != null && productCount > maxProducts) continue;
    if (search) {
      const hay = `${email ?? ""} ${profile.id}`.toLowerCase();
      if (!hay.includes(search)) continue;
    }

    rows.push({
      id: profile.id,
      email,
      plan,
      subscriptionStatus: profile.subscription_status ?? "none",
      productCount,
      storeCount: storeCountByOwner.get(profile.id) ?? 0,
      periodEndsAt: profile.subscription_period_ends_at ?? null,
      createdAt: null,
    });
  }

  rows.sort((a, b) => b.productCount - a.productCount);
  return rows.slice(0, limit);
}
