import type { Profile } from "@/lib/database.types";
import {
  normalizeDbPlan,
  resolveSubscriptionStatus,
} from "@/lib/plans/plan-activation";

/**
 * Acceso al mercado oculto: suscripción de pago activa o provisional
 * (PRO / BUSINESS / ENTERPRISE). No incluye FREE ni solo trial.
 */
export function hasMercadoOcultoSubscription(
  profile: Pick<Profile, "plan" | "subscription_status"> | null | undefined,
): boolean {
  if (!profile) return false;
  const plan = normalizeDbPlan(profile.plan);
  if (plan === "FREE") return false;
  const status = resolveSubscriptionStatus(profile.subscription_status);
  return status === "active" || status === "provisional";
}

export type MercadoAccessDenialReason =
  | "unauthenticated"
  | "no_subscription"
  | "free_plan";

export function resolveMercadoOcultoDenial(
  profile: Pick<Profile, "plan" | "subscription_status"> | null | undefined,
  authenticated: boolean,
): MercadoAccessDenialReason | null {
  if (!authenticated) return "unauthenticated";
  if (!profile) return "no_subscription";
  if (normalizeDbPlan(profile.plan) === "FREE") return "free_plan";
  if (!hasMercadoOcultoSubscription(profile)) return "no_subscription";
  return null;
}
