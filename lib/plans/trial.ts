import type { Profile } from "@/lib/database.types";
import {
  getPlanById,
  resolvePlanId,
  type PlanId,
} from "@/src/config/plans";

export interface ProTrialStatus {
  eligible: boolean;
  active: boolean;
  consumed: boolean;
  startedAt: string | null;
  endsAt: string | null;
}

export function resolveProTrialStatus(
  profile: Pick<
    Profile,
    "plan" | "pro_trial_started_at" | "pro_trial_ends_at"
  > | null,
): ProTrialStatus {
  const planId = resolvePlanId(profile?.plan);
  const startedAt = profile?.pro_trial_started_at ?? null;
  const endsAt = profile?.pro_trial_ends_at ?? null;
  const now = Date.now();
  const endsMs = endsAt ? new Date(endsAt).getTime() : null;
  const active =
    planId === "free" &&
    startedAt != null &&
    endsMs != null &&
    endsMs > now;
  const consumed = startedAt != null && !active;
  const eligible = planId === "free" && startedAt == null;

  return {
    eligible,
    active,
    consumed,
    startedAt,
    endsAt: active ? endsAt : endsAt,
  };
}

/** Plan efectivo para límites de productos (trial Pro = starter/250). */
export function getEffectivePlanIdForLimits(
  planId: PlanId,
  trial: ProTrialStatus,
): PlanId {
  if (planId === "free" && trial.active) {
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
