import type { Profile } from "@/lib/database.types";
import {
  getPlanById,
  resolvePlanId,
  type PlanDefinition,
  type PlanId,
} from "@/src/config/plans";
import { isEligiblePlanForProTrial } from "@/lib/plans/plan-activation";

export interface ProTrialStatus {
  eligible: boolean;
  active: boolean;
  consumed: boolean;
  startedAt: string | null;
  endsAt: string | null;
}

export const PRO_TRIAL_DISPLAY_PLAN_NAME = "Plan Pro";

export function resolveProTrialStatus(
  profile: Pick<
    Profile,
    "plan" | "subscription_status" | "pro_trial_started_at" | "pro_trial_ends_at"
  > | null,
  planId?: PlanId,
): ProTrialStatus {
  const resolvedPlanId = planId ?? resolvePlanId(profile?.plan);
  const startedAt = profile?.pro_trial_started_at ?? null;
  const endsAt = profile?.pro_trial_ends_at ?? null;
  const now = Date.now();
  const endsMs = endsAt ? new Date(endsAt).getTime() : null;
  const active =
    startedAt != null &&
    endsMs != null &&
    endsMs > now;
  const consumed = startedAt != null && !active;
  const eligible = isEligiblePlanForProTrial(profile) && !active;

  return {
    eligible,
    active,
    consumed,
    startedAt,
    endsAt: active ? endsAt : endsAt,
  };
}

/** Plan y nombre mostrados en UI (trial activo = Plan Pro / starter). */
export function getDisplayPlanForProfile(
  profile: Pick<
    Profile,
    "plan" | "subscription_status" | "pro_trial_started_at" | "pro_trial_ends_at"
  > | null,
): { planId: PlanId; plan: PlanDefinition; planName: string } {
  const basePlanId = resolvePlanId(profile?.plan);
  const trial = resolveProTrialStatus(profile, basePlanId);

  if (trial.active) {
    return {
      planId: "starter",
      plan: getPlanById("starter"),
      planName: PRO_TRIAL_DISPLAY_PLAN_NAME,
    };
  }

  const plan = getPlanById(basePlanId);
  return {
    planId: basePlanId,
    plan,
    planName: plan.name,
  };
}

/** Muestra el banner de prueba Pro (elegible, activo o consumido). */
export function shouldShowProTrialBanner(
  profile: Pick<
    Profile,
    "plan" | "subscription_status" | "pro_trial_started_at" | "pro_trial_ends_at"
  > | null,
): boolean {
  const trial = resolveProTrialStatus(profile);
  if (trial.active) return true;
  if (trial.consumed) return false;
  return isEligiblePlanForProTrial(profile);
}

/** Plan efectivo para límites de productos (trial Pro = starter/250). */
export function getEffectivePlanIdForLimits(
  planId: PlanId,
  trial: ProTrialStatus,
): PlanId {
  if (trial.active) {
    return "starter";
  }
  return planId;
}

export function formatProTrialEndsAt(endsAt: string | null): string {
  if (!endsAt) return "";
  return new Intl.DateTimeFormat("es", { dateStyle: "long" }).format(
    new Date(endsAt),
  );
}

export function getProTrialLimitLabel(): string {
  return `${getPlanById("starter").productLimit} productos`;
}
