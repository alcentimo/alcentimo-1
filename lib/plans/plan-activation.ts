import type { Profile, ProfilePlanDb } from "@/lib/database.types";
import type { ManualPaymentPlanId } from "@/lib/database.types";
import { resolvePlanId, type PlanId } from "@/src/config/plans";
import {
  addBillingPeriod,
  type BillingPeriod,
} from "@/lib/plans/proration";

export type SubscriptionStatus = "none" | "provisional" | "active";

export type PlanChangeDirection = "upgrade" | "downgrade" | "same";

/** Ranking comercial para upgrades/downgrades (FREE < PRO < BUSINESS < ENTERPRISE). */
export const DB_PLAN_RANK: Record<ProfilePlanDb, number> = {
  FREE: 0,
  PRO: 1,
  BUSINESS: 2,
  ENTERPRISE: 3,
};

/** IDs internos del checkout → valores persistidos en profiles.plan */
const PLAN_ID_TO_DB: Record<ManualPaymentPlanId, ProfilePlanDb> = {
  starter: "PRO",
  premium: "BUSINESS",
  enterprise: "ENTERPRISE",
};

export function normalizeDbPlan(value: string | null | undefined): ProfilePlanDb {
  const normalized = (value ?? "FREE").trim().toUpperCase();
  if (normalized === "FREE") return "FREE";
  if (
    normalized === "PRO" ||
    normalized === "STARTER" ||
    normalized === "GROWTH"
  ) {
    return "PRO";
  }
  if (normalized === "BUSINESS" || normalized === "PREMIUM") {
    return "BUSINESS";
  }
  if (normalized === "ENTERPRISE") {
    return "ENTERPRISE";
  }
  return "FREE";
}

export function planIdToDbPlan(planId: PlanId): ProfilePlanDb {
  if (planId === "starter" || planId === "growth") return "PRO";
  if (planId === "premium") return "BUSINESS";
  if (planId === "enterprise") return "ENTERPRISE";
  return "FREE";
}

export function compareDbPlans(
  fromPlan: string | null | undefined,
  toPlan: string | null | undefined,
): PlanChangeDirection {
  const from = normalizeDbPlan(fromPlan);
  const to = normalizeDbPlan(toPlan);
  if (DB_PLAN_RANK[to] > DB_PLAN_RANK[from]) return "upgrade";
  if (DB_PLAN_RANK[to] < DB_PLAN_RANK[from]) return "downgrade";
  return "same";
}

/** Limpia un downgrade programado (p. ej. tras un upgrade). */
export function clearPendingPlanFields() {
  return {
    pending_plan: null,
    pending_billing_period: null,
    pending_plan_effective_at: null,
    pending_plan_requested_at: null,
  };
}

export function resolveSubscriptionStatus(
  value: string | null | undefined,
): SubscriptionStatus {
  if (value === "provisional" || value === "active") return value;
  return "none";
}

/** Etiqueta corta para UI (sidebar, resumen de cuenta). */
export function formatSubscriptionStatusLabel(
  value: string | null | undefined,
  options?: {
    trialActive?: boolean;
    trialPhase?: "none" | "active" | "grace" | "review" | "closed";
  },
): string {
  const status = resolveSubscriptionStatus(value);
  if (status === "provisional") return "Provisional";
  if (options?.trialPhase === "grace") return "Prórroga";
  if (options?.trialPhase === "review") return "En revisión";
  if (options?.trialPhase === "active" || options?.trialActive) {
    return "Prueba activa";
  }
  if (status === "active") return "Activo";
  return "Activo";
}

/**
 * ¿Puede reclamar la prueba Pro gratis?
 * Solo plan FREE en BD y subscription_status = none. No valida conteo de productos.
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

  return (
    normalizeDbPlan(profile.plan) === "FREE" &&
    resolveSubscriptionStatus(profile.subscription_status) === "none"
  );
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
  return value === "starter" || value === "premium" || value === "enterprise";
}

/** Limpia trial Pro al activar suscripción de pago y reinicia el ciclo. */
export function buildPaidProfilePatch(
  planDb: ProfilePlanDb,
  subscriptionStatus: SubscriptionStatus,
  options?: {
    billingPeriod?: BillingPeriod;
    periodStartedAt?: Date;
    /** Si se define, sustituye el fin de ciclo calculado por billingPeriod. */
    periodEndsAt?: Date;
  },
) {
  if (planDb === "FREE") {
    return {
      plan: planDb,
      subscription_status: subscriptionStatus,
      pro_trial_started_at: null,
      pro_trial_ends_at: null,
      pro_trial_closed_at: null,
      billing_period: null,
      subscription_period_started_at: null,
      subscription_period_ends_at: null,
      ...clearPendingPlanFields(),
    };
  }

  const billingPeriod = options?.billingPeriod ?? "monthly";
  const startedAt = options?.periodStartedAt ?? new Date();
  const endsAt =
    options?.periodEndsAt ?? addBillingPeriod(startedAt, billingPeriod);

  return {
    plan: planDb,
    subscription_status: subscriptionStatus,
    pro_trial_started_at: null,
    pro_trial_ends_at: null,
    pro_trial_closed_at: null,
    billing_period: billingPeriod,
    subscription_period_started_at: startedAt.toISOString(),
    subscription_period_ends_at: endsAt.toISOString(),
    ...clearPendingPlanFields(),
  };
}

export function buildRevokedProfilePatch() {
  return buildPaidProfilePatch("FREE", "none");
}
