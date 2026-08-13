"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthUser } from "@/lib/auth/require-dashboard-auth";
import type { Profile, ProfilePlanDb } from "@/lib/database.types";
import {
  clearPendingPlanFields,
  compareDbPlans,
  normalizeDbPlan,
  planIdToDbPlan,
  resolveSubscriptionStatus,
} from "@/lib/plans/plan-activation";
import {
  isBillingPeriod,
  resolvePeriodEndsAtFromStart,
  type BillingPeriod,
} from "@/lib/plans/proration";
import type { PlanId } from "@/src/config/plans";
export type PlanChangeActionResult = {
  error?: string;
  success?: boolean;
  effectiveAt?: string;
  pendingPlan?: ProfilePlanDb;
};

function revalidatePlanChangePaths() {
  revalidatePath("/dashboard/planes");
  revalidatePath("/activar");
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard", "layout");
}

function resolveEffectivePeriodEndsAt(
  profile: Pick<
    Profile,
    | "billing_period"
    | "subscription_period_started_at"
    | "subscription_period_ends_at"
  > | null,
): string | null {
  const billing: BillingPeriod =
    profile?.billing_period && isBillingPeriod(profile.billing_period)
      ? profile.billing_period
      : "monthly";
  return resolvePeriodEndsAtFromStart(
    profile?.subscription_period_started_at,
    billing,
    profile?.subscription_period_ends_at,
  );
}

/**
 * Programa un downgrade al fin del ciclo actual.
 * Mantiene el plan costoso hasta pending_plan_effective_at.
 */
export async function schedulePlanDowngrade(input: {
  targetPlanId: PlanId;
  billingPeriod?: BillingPeriod;
}): Promise<PlanChangeActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthUser(supabase);
  if (!auth.ok) return { error: auth.error };

  const targetPlan = planIdToDbPlan(input.targetPlanId);
  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select(
      "plan, subscription_status, billing_period, subscription_period_started_at, subscription_period_ends_at, pending_plan, pending_billing_period, pending_plan_effective_at",
    )
    .eq("id", auth.authUser.id)
    .maybeSingle();

  if (profileError) return { error: profileError.message };
  if (!profile) return { error: "No se encontró tu perfil de suscripción." };

  const currentPlan = normalizeDbPlan(profile.plan);
  const direction = compareDbPlans(currentPlan, targetPlan);

  if (direction !== "downgrade") {
    return {
      error:
        direction === "same"
          ? "Ya estás en ese plan."
          : "Para subir de plan usa el checkout con pago. El cambio diferido solo aplica a bajadas.",
    };
  }

  if (currentPlan === "FREE") {
    return { error: "No hay un plan superior activo para bajar." };
  }

  const status = resolveSubscriptionStatus(profile.subscription_status);
  if (status === "provisional") {
    return {
      error:
        "Tienes un pago en revisión. Espera la confirmación antes de programar una bajada de plan.",
    };
  }

  if (status !== "active") {
    return {
      error:
        "Solo puedes programar un cambio si tu suscripción de pago está activa.",
    };
  }

  const effectiveAt = resolveEffectivePeriodEndsAt(profile);
  if (!effectiveAt) {
    return {
      error:
        "No encontramos la fecha de corte de tu ciclo actual. Contacta soporte para programar el cambio.",
    };
  }

  const effectiveMs = new Date(effectiveAt).getTime();
  if (Number.isNaN(effectiveMs) || effectiveMs <= Date.now()) {
    return {
      error:
        "Tu ciclo actual ya venció o está por vencer. Renueva o contacta soporte antes de programar la bajada.",
    };
  }

  const pendingBilling: BillingPeriod | null =
    targetPlan === "FREE"
      ? null
      : input.billingPeriod && isBillingPeriod(input.billingPeriod)
        ? input.billingPeriod
        : profile.billing_period && isBillingPeriod(profile.billing_period)
          ? profile.billing_period
          : "monthly";

  const nowIso = new Date().toISOString();
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      pending_plan: targetPlan,
      pending_billing_period: pendingBilling,
      pending_plan_effective_at: effectiveAt,
      pending_plan_requested_at: nowIso,
    })
    .eq("id", auth.authUser.id);

  if (updateError) return { error: updateError.message };

  revalidatePlanChangePaths();
  return {
    success: true,
    effectiveAt,
    pendingPlan: targetPlan,
  };
}

/** Cancela un downgrade programado y conserva el plan actual. */
export async function cancelScheduledPlanDowngrade(): Promise<PlanChangeActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthUser(supabase);
  if (!auth.ok) return { error: auth.error };

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("pending_plan")
    .eq("id", auth.authUser.id)
    .maybeSingle();

  if (profileError) return { error: profileError.message };
  if (!profile?.pending_plan) {
    return { error: "No tienes un cambio de plan programado." };
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update(clearPendingPlanFields())
    .eq("id", auth.authUser.id);

  if (updateError) return { error: updateError.message };

  revalidatePlanChangePaths();
  return { success: true };
}
