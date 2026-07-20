import type { Profile } from "@/lib/database.types";
import {
  getPlanById,
  resolvePlanId,
  type PlanDefinition,
  type PlanId,
} from "@/src/config/plans";
import { PLAN_PRICING_TIERS } from "@/src/config/plan-pricing-ui";
import { isEligiblePlanForProTrial } from "@/lib/plans/plan-activation";

export interface ProTrialStatus {
  eligible: boolean;
  active: boolean;
  consumed: boolean;
  startedAt: string | null;
  endsAt: string | null;
}

export const PRO_TRIAL_DISPLAY_PLAN_NAME = "Plan Pro";

function getCommercialPlanLabel(planId: PlanId): string {
  const tier = PLAN_PRICING_TIERS.find((entry) => entry.planId === planId);
  if (tier) {
    return planId === "free" ? "Plan Gratis" : `Plan ${tier.displayName}`;
  }
  return getPlanById(planId).name;
}

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
    planName: getCommercialPlanLabel(basePlanId),
  };
}

export function hasUnusedProTrial(
  profile: Pick<Profile, "pro_trial_started_at"> | null,
): boolean {
  return profile != null && profile.pro_trial_started_at == null;
}

export const PRO_TRIAL_AT_LIMIT_MESSAGE =
  "¡Has alcanzado tu límite! Activa una prueba gratuita de un mes del plan Pro (250 productos)";

/** Prioriza ofrecer la prueba Pro al llegar al límite de productos del plan Gratis. */
export function shouldPromoteProTrialAtLimit(
  trial?: Pick<
    ProTrialStatus,
    "eligible" | "active" | "consumed" | "startedAt"
  > | null,
): boolean {
  if (!trial || trial.active || trial.consumed) return false;
  if (trial.startedAt != null) return false;
  return trial.eligible;
}

/** Muestra el banner de prueba Pro (elegible, activo o consumido). */
export function shouldShowProTrialBanner(
  profile: Pick<
    Profile,
    "plan" | "subscription_status" | "pro_trial_started_at" | "pro_trial_ends_at"
  > | null,
): boolean {
  return shouldShowProTrialOnActivar(profile);
}

/**
 * /activar: prueba obligatoria si nunca se usó (pro_trial_started_at NULL) y el perfil es elegible.
 * No depende del conteo de productos ni de haber alcanzado el límite.
 */
export function shouldShowProTrialOnActivar(
  profile: Pick<
    Profile,
    "plan" | "subscription_status" | "pro_trial_started_at" | "pro_trial_ends_at"
  > | null,
): boolean {
  if (!profile) return false;

  const trial = resolveProTrialStatus(profile);
  if (trial.active) return true;
  if (!hasUnusedProTrial(profile)) return false;

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

export function getProTrialLimitLabel(productLimit?: number | null): string {
  const limit =
    productLimit === undefined
      ? getPlanById("starter").productLimit
      : productLimit;
  if (limit == null) return "productos ilimitados";
  return `${limit} productos`;
}
