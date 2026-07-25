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

function emptyPlanCounts(): Record<ProfilePlanDb, number> {
  return { FREE: 0, PRO: 0, BUSINESS: 0, ENTERPRISE: 0 };
}

/** Resumen de usuarios, tiendas y planes desde public.profiles (service role). */
export async function getAdminPlanMetrics(): Promise<AdminPlanMetrics> {
  const admin = createAdminClient();

  const byPlan = emptyPlanCounts();
  const storesByPlan = emptyPlanCounts();
  let totalUsers = 0;
  let totalStores = 0;
  let verifiedPaymentsUsd = 0;
  let pendingPayments = 0;

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, plan");

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const planByOwner = new Map<string, ProfilePlanDb>();
  for (const row of profiles ?? []) {
    const plan = normalizeDbPlan(row.plan);
    byPlan[plan] += 1;
    planByOwner.set(row.id, plan);
  }
  totalUsers = profiles?.length ?? 0;

  const { data: stores, error: storesError } = await admin
    .from("stores")
    .select("id, owner_id");

  if (!storesError) {
    totalStores = stores?.length ?? 0;
    for (const store of stores ?? []) {
      const plan = planByOwner.get(store.owner_id) ?? "FREE";
      storesByPlan[plan] += 1;
    }
  }

  const { data: payments, error: paymentsError } = await admin
    .from("manual_payments")
    .select("status, amount_due_usd")
    .limit(5000);

  if (!paymentsError) {
    for (const payment of payments ?? []) {
      if (payment.status === "verified" && payment.amount_due_usd != null) {
        verifiedPaymentsUsd += Number(payment.amount_due_usd) || 0;
      }
      if (
        payment.status === "pending" ||
        payment.status === "needs_correction"
      ) {
        pendingPayments += 1;
      }
    }
  } else {
    const { data: fallbackPayments, error: fallbackError } = await admin
      .from("manual_payments")
      .select("status")
      .limit(5000);

    if (!fallbackError) {
      for (const payment of fallbackPayments ?? []) {
        if (
          payment.status === "pending" ||
          payment.status === "needs_correction"
        ) {
          pendingPayments += 1;
        }
      }
    }
  }

  return {
    totalUsers,
    totalStores,
    byPlan,
    storesByPlan,
    verifiedPaymentsUsd: Math.round(verifiedPaymentsUsd * 100) / 100,
    pendingPayments,
  };
}
