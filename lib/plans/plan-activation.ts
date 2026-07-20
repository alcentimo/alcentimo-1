import type { ProfilePlanDb } from "@/lib/database.types";
import type { ManualPaymentPlanId } from "@/lib/database.types";
import { resolvePlanId, type PlanId } from "@/src/config/plans";

export type SubscriptionStatus = "none" | "provisional" | "active";

const PLAN_ID_TO_DB: Record<ManualPaymentPlanId, ProfilePlanDb> = {
  starter: "STARTER",
  premium: "PREMIUM",
};

export function manualPaymentPlanToDbPlan(
  planId: ManualPaymentPlanId,
): ProfilePlanDb {
  return PLAN_ID_TO_DB[planId];
}

export function dbPlanToPlanId(plan: string | null | undefined): PlanId {
  return resolvePlanId(plan);
}

export function isManualPaymentPlanId(value: string): value is ManualPaymentPlanId {
  return value === "starter" || value === "premium";
}

/** Limpia trial Pro al activar suscripción de pago. */
export function buildPaidProfilePatch(
  planDb: ProfilePlanDb,
  subscriptionStatus: SubscriptionStatus,
) {
  return {
    plan: planDb,
    subscription_status: subscriptionStatus,
    pro_trial_started_at: null,
    pro_trial_ends_at: null,
  };
}

export function buildRevokedProfilePatch() {
  return buildPaidProfilePatch("FREE", "none");
}
