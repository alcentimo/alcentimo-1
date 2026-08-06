import type { Profile } from "@/lib/database.types";
import {
  getPlanById,
  resolvePlanId,
  type PlanDefinition,
  type PlanId,
} from "@/src/config/plans";
import { PLAN_PRICING_TIERS } from "@/src/config/plan-pricing-ui";
import { isEligiblePlanForProTrial } from "@/lib/plans/plan-activation";

/** Días de prórroga con beneficios Pro tras el fin formal de la prueba. */
export const PRO_TRIAL_GRACE_DAYS = 5;

export type ProTrialPhase =
  | "none"
  | "active"
  | "grace"
  | "review"
  | "closed";

export interface ProTrialStatus {
  eligible: boolean;
  /** Periodo formal de prueba (antes de pro_trial_ends_at). */
  active: boolean;
  /** Prórroga de 5 días con beneficios Pro y aviso. */
  inGrace: boolean;
  /** Tras la prórroga: sigue con beneficios hasta cierre admin. */
  inReview: boolean;
  /** Admin cerró la prueba → Plan Gratis efectivo. */
  closed: boolean;
  /**
   * Beneficios Pro (límites/UI): activos en active, grace y review.
   * Solo se cortan con cierre admin (o suscripción de pago).
   */
  benefitsActive: boolean;
  /** Ya usó la prueba y no tiene beneficios (cerrada o elegible false). */
  consumed: boolean;
  startedAt: string | null;
  endsAt: string | null;
  graceEndsAt: string | null;
  closedAt: string | null;
  phase: ProTrialPhase;
}

export const PRO_TRIAL_DISPLAY_PLAN_NAME = "Plan Pro";

type TrialProfilePick = Pick<
  Profile,
  | "plan"
  | "subscription_status"
  | "pro_trial_started_at"
  | "pro_trial_ends_at"
  | "pro_trial_closed_at"
>;

export function getCommercialPlanLabel(planId: PlanId): string {
  const tier = PLAN_PRICING_TIERS.find((entry) => entry.planId === planId);
  if (tier) {
    return planId === "free" ? "Plan Gratis" : `Plan ${tier.displayName}`;
  }
  return getPlanById(planId).name;
}

function addDaysIso(iso: string, days: number): string {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function resolveProTrialStatus(
  profile: TrialProfilePick | null,
  planId?: PlanId,
): ProTrialStatus {
  void planId;
  const startedAt = profile?.pro_trial_started_at ?? null;
  const endsAt = profile?.pro_trial_ends_at ?? null;
  const closedAt = profile?.pro_trial_closed_at ?? null;
  const now = Date.now();
  const endsMs = endsAt ? new Date(endsAt).getTime() : null;
  const graceEndsAt =
    endsAt != null ? addDaysIso(endsAt, PRO_TRIAL_GRACE_DAYS) : null;
  const graceEndsMs = graceEndsAt ? new Date(graceEndsAt).getTime() : null;

  const closed = startedAt != null && closedAt != null;
  const active =
    !closed &&
    startedAt != null &&
    endsMs != null &&
    endsMs > now;
  const inGrace =
    !closed &&
    startedAt != null &&
    endsMs != null &&
    endsMs <= now &&
    graceEndsMs != null &&
    graceEndsMs > now;
  const inReview =
    !closed &&
    startedAt != null &&
    endsMs != null &&
    graceEndsMs != null &&
    graceEndsMs <= now;

  const benefitsActive = active || inGrace || inReview;
  const consumed = startedAt != null && !benefitsActive;
  const eligible = isEligiblePlanForProTrial(profile) && !benefitsActive;

  let phase: ProTrialPhase = "none";
  if (closed) phase = "closed";
  else if (active) phase = "active";
  else if (inGrace) phase = "grace";
  else if (inReview) phase = "review";

  return {
    eligible,
    active,
    inGrace,
    inReview,
    closed,
    benefitsActive,
    consumed,
    startedAt,
    endsAt,
    graceEndsAt: benefitsActive || closed ? graceEndsAt : graceEndsAt,
    closedAt,
    phase,
  };
}

/** Plan y nombre mostrados en UI (beneficios Pro = Plan Pro / starter). */
export function getDisplayPlanForProfile(
  profile: TrialProfilePick | null,
): { planId: PlanId; plan: PlanDefinition; planName: string } {
  const basePlanId = resolvePlanId(profile?.plan);
  const trial = resolveProTrialStatus(profile, basePlanId);

  if (trial.benefitsActive) {
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
  "¡Tu catálogo ya está listo para la prueba! Completa pagos y envíos para reclamar tu mes gratis del Plan Pro.";

export const PRO_TRIAL_NEAR_LIMIT_MESSAGE =
  "¡Estás a pocos productos de desbloquear tu mes gratis del Plan Pro! Sigue sumando artículos.";

/** Palabra obligatoria para reclamar el mes gratis del Plan Pro. */
export const PRO_TRIAL_CLAIM_CODE = "ALCENTIMO";

export function isValidProTrialClaimCode(claimCode: string): boolean {
  return claimCode.trim().toUpperCase() === PRO_TRIAL_CLAIM_CODE;
}

/** Prioriza ofrecer la prueba Pro al llegar al límite de productos del plan Gratis. */
export function shouldPromoteProTrialAtLimit(
  trial?: Pick<
    ProTrialStatus,
    "eligible" | "active" | "consumed" | "startedAt" | "benefitsActive"
  > | null,
): boolean {
  if (!trial || trial.benefitsActive || trial.consumed) return false;
  if (trial.startedAt != null) return false;
  return trial.eligible;
}

/** Muestra el banner de prueba Pro (elegible o con beneficios activos). */
export function shouldShowProTrialBanner(
  profile: TrialProfilePick | null,
): boolean {
  return shouldShowProTrialOnActivar(profile);
}

/**
 * /activar: prueba si nunca se usó y es elegible, o si aún tiene beneficios activos.
 */
export function shouldShowProTrialOnActivar(
  profile: TrialProfilePick | null,
): boolean {
  if (!profile) return false;

  const trial = resolveProTrialStatus(profile);
  if (trial.benefitsActive) return true;
  if (!hasUnusedProTrial(profile)) return false;

  return isEligiblePlanForProTrial(profile);
}

/** Plan efectivo para límites (beneficios Pro = starter/250). */
export function getEffectivePlanIdForLimits(
  planId: PlanId,
  trial: ProTrialStatus,
): PlanId {
  if (trial.benefitsActive) {
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

/** Fecha corta dd/mm/aaaa para resúmenes de prueba. */
export function formatProTrialShortDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

/** Días calendario restantes hasta el fin formal de la prueba (≥ 0). */
export function getProTrialDaysRemaining(
  endsAt: string | null,
  nowMs: number = Date.now(),
): number | null {
  if (!endsAt) return null;
  const endsMs = new Date(endsAt).getTime();
  if (Number.isNaN(endsMs)) return null;
  const remainingMs = endsMs - nowMs;
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
}

export function formatProTrialDaysRemainingLabel(
  daysRemaining: number | null,
): string | null {
  if (daysRemaining == null) return null;
  if (daysRemaining <= 0) return "Tu prueba finaliza hoy";
  if (daysRemaining === 1) return "Te queda 1 día de prueba";
  return `Te quedan ${daysRemaining} días de prueba`;
}

export function getProTrialLimitLabel(productLimit?: number | null): string {
  const limit =
    productLimit === undefined
      ? getPlanById("starter").productLimit
      : productLimit;
  if (limit == null) return "productos ilimitados";
  return `${limit} productos`;
}

/** Etiqueta corta de fase para sidebar / badges. */
export function formatProTrialPhaseLabel(trial: ProTrialStatus): string | null {
  if (trial.phase === "active") return "Prueba activa";
  if (trial.phase === "grace") return "Prórroga";
  if (trial.phase === "review") return "En revisión";
  return null;
}
