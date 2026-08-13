import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile, ProfilePlanDb } from "@/lib/database.types";
import { normalizeDbPlan } from "@/lib/plans/plan-activation";
import { isBillingPeriod, type BillingPeriod } from "@/lib/plans/proration";
import { applyDuePendingPlanForUser } from "@/lib/plans/apply-pending-plans";

export type PendingPlanSummary = {
  pendingPlan: ProfilePlanDb;
  pendingBillingPeriod: BillingPeriod | null;
  effectiveAt: string;
  requestedAt: string | null;
};

export function getPendingPlanSummary(
  profile:
    | Pick<
        Profile,
        | "pending_plan"
        | "pending_billing_period"
        | "pending_plan_effective_at"
        | "pending_plan_requested_at"
      >
    | null
    | undefined,
): PendingPlanSummary | null {
  if (!profile?.pending_plan || !profile.pending_plan_effective_at) {
    return null;
  }

  const pendingPlan = normalizeDbPlan(profile.pending_plan);
  const pendingBillingPeriod =
    profile.pending_billing_period &&
    isBillingPeriod(profile.pending_billing_period)
      ? profile.pending_billing_period
      : null;

  return {
    pendingPlan,
    pendingBillingPeriod,
    effectiveAt: profile.pending_plan_effective_at,
    requestedAt: profile.pending_plan_requested_at ?? null,
  };
}

/**
 * Si el downgrade ya venció, lo aplica antes de leer límites/plan.
 * Ideal para sesiones de dashboard y chequeos de cupo.
 */
export async function syncDuePendingPlanForUser(
  userId: string,
): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("pending_plan, pending_plan_effective_at")
    .eq("id", userId)
    .maybeSingle();

  if (!data?.pending_plan || !data.pending_plan_effective_at) return;

  const effectiveMs = new Date(data.pending_plan_effective_at).getTime();
  if (Number.isNaN(effectiveMs) || effectiveMs > Date.now()) return;

  await applyDuePendingPlanForUser(userId);
}
