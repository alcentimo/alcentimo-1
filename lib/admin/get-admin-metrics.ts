import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeDbPlan } from "@/lib/plans/plan-activation";
import type { ProfilePlanDb } from "@/lib/database.types";

export interface AdminPlanMetrics {
  totalUsers: number;
  totalStores: number;
  byPlan: Record<ProfilePlanDb, number>;
  storesByPlan: Record<ProfilePlanDb, number>;
  verifiedPaymentsUsd: number;
  pendingPayments: number;
}

/** Resumen de usuarios, tiendas y planes desde public.profiles (service role). */
export async function getAdminPlanMetrics(): Promise<AdminPlanMetrics> {
  const admin = createAdminClient();

  const [
    { data: profiles, error: profilesError },
    { data: stores, error: storesError },
    { data: payments, error: paymentsError },
  ] = await Promise.all([
    admin.from("profiles").select("id, plan"),
    admin.from("stores").select("id, owner_id"),
    admin
      .from("manual_payments")
      .select("status, amount_due_usd")
      .limit(5000),
  ]);

  if (profilesError) throw new Error(profilesError.message);
  if (storesError) throw new Error(storesError.message);
  if (paymentsError) throw new Error(paymentsError.message);

  const byPlan: Record<ProfilePlanDb, number> = {
    FREE: 0,
    PRO: 0,
    BUSINESS: 0,
    ENTERPRISE: 0,
  };

  const planByOwner = new Map<string, ProfilePlanDb>();
  for (const row of profiles ?? []) {
    const plan = normalizeDbPlan(row.plan);
    byPlan[plan] += 1;
    planByOwner.set(row.id, plan);
  }

  const storesByPlan: Record<ProfilePlanDb, number> = {
    FREE: 0,
    PRO: 0,
    BUSINESS: 0,
    ENTERPRISE: 0,
  };

  for (const store of stores ?? []) {
    const plan = planByOwner.get(store.owner_id) ?? "FREE";
    storesByPlan[plan] += 1;
  }

  let verifiedPaymentsUsd = 0;
  let pendingPayments = 0;
  for (const payment of payments ?? []) {
    if (payment.status === "verified" && payment.amount_due_usd != null) {
      verifiedPaymentsUsd += Number(payment.amount_due_usd) || 0;
    }
    if (payment.status === "pending" || payment.status === "needs_correction") {
      pendingPayments += 1;
    }
  }

  return {
    totalUsers: profiles?.length ?? 0,
    totalStores: stores?.length ?? 0,
    byPlan,
    storesByPlan,
    verifiedPaymentsUsd: Math.round(verifiedPaymentsUsd * 100) / 100,
    pendingPayments,
  };
}
