import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeDbPlan } from "@/lib/plans/plan-activation";
import type { ProfilePlanDb } from "@/lib/database.types";

export interface AdminPlanMetrics {
  totalUsers: number;
  byPlan: Record<ProfilePlanDb, number>;
}

/** Resumen de usuarios y planes desde public.profiles (service role). */
export async function getAdminPlanMetrics(): Promise<AdminPlanMetrics> {
  const admin = createAdminClient();

  const { data, error } = await admin.from("profiles").select("plan");

  if (error) {
    throw new Error(error.message);
  }

  const byPlan: Record<ProfilePlanDb, number> = {
    FREE: 0,
    PRO: 0,
    BUSINESS: 0,
    ENTERPRISE: 0,
  };

  for (const row of data ?? []) {
    const plan = normalizeDbPlan(row.plan);
    byPlan[plan] += 1;
  }

  return {
    totalUsers: data?.length ?? 0,
    byPlan,
  };
}
