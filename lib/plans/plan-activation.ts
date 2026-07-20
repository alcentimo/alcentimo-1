import type { Profile, ProfilePlanDb } from "@/lib/database.types";
import type { ManualPaymentPlanId } from "@/lib/database.types";
import { resolvePlanId, type PlanId } from "@/src/config/plans";

export type SubscriptionStatus = "none" | "provisional" | "active";

const PLAN_ID_TO_DB: Record<ManualPaymentPlanId, ProfilePlanDb> = {
  starter: "STARTER",
  premium: "PREMIUM",
};

export function normalizeDbPlan(value: string | null | undefined): ProfilePlanDb {
  const normalized = (value ?? "FREE").trim().toUpperCase();
  if (
    normalized === "FREE" ||
    normalized === "STARTER" ||
    normalized === "GROWTH" ||
    normalized === "PREMIUM"
  ) {
    return normalized;
  }
  return "FREE";
}

export function resolveSubscriptionStatus(
  value: string | null | undefined,
): SubscriptionStatus {
  if (value === "provisional" || value === "active") return value;
  return "none";
}

/**
 * ¿Puede reclamar la prueba Pro gratis?
 * Permisivo: plan FREE, o acceso de pago aún no verificado (provisional / none).
 */
export function isEligiblePlanForProTrial(
  profile: Pick<
    Profile,
    "plan" | "subscription_status" | "pro_trial_started_at"
  > | null,
): boolean {
  if (!profile || profile.pro_trial_started_at != null) {
    return false;
  }

  const subscriptionStatus = resolveSubscriptionStatus(profile.subscription_status);
  if (subscriptionStatus === "active") {
    return false;
  }

  const planNorm = normalizeDbPlan(profile.plan);
  if (planNorm === "FREE") {
    return true;
  }

  // Acceso de confianza pendiente o plan elevado sin suscripción verificada.
  return subscriptionStatus === "provisional" || subscriptionStatus === "none";
}

/** Normaliza el perfil a FREE antes de iniciar la prueba (p. ej. STARTER provisional). */
export function needsProTrialPlanReset(
  profile: Pick<Profile, "plan" | "subscription_status">,
): boolean {
  return normalizeDbPlan(profile.plan) !== "FREE";
}

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
