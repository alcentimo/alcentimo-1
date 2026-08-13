import { createAdminClient } from "@/lib/supabase/admin";
import type { ProfilePlanDb } from "@/lib/database.types";
import {
  buildPaidProfilePatch,
  buildRevokedProfilePatch,
  clearPendingPlanFields,
  compareDbPlans,
  normalizeDbPlan,
} from "@/lib/plans/plan-activation";
import { isBillingPeriod, type BillingPeriod } from "@/lib/plans/proration";

export type ApplyPendingPlanResult = {
  applied: number;
  errors: string[];
};

function buildAppliedPlanPatch(
  pendingPlan: ProfilePlanDb,
  pendingBilling: BillingPeriod | null,
  effectiveAt: Date,
) {
  if (pendingPlan === "FREE") {
    return {
      ...buildRevokedProfilePatch(),
      ...clearPendingPlanFields(),
    };
  }

  return buildPaidProfilePatch(pendingPlan, "active", {
    billingPeriod: pendingBilling ?? "monthly",
    periodStartedAt: effectiveAt,
  });
}

/**
 * Aplica downgrades vencidos (cron o lazy-apply por usuario).
 */
export async function applyDuePendingPlanChanges(options?: {
  userId?: string;
  now?: Date;
  limit?: number;
}): Promise<ApplyPendingPlanResult> {
  const admin = createAdminClient();
  const now = options?.now ?? new Date();
  const nowIso = now.toISOString();
  const limit = options?.limit ?? 200;

  let query = admin
    .from("profiles")
    .select(
      "id, plan, pending_plan, pending_billing_period, pending_plan_effective_at",
    )
    .not("pending_plan", "is", null)
    .lte("pending_plan_effective_at", nowIso)
    .order("pending_plan_effective_at", { ascending: true })
    .limit(limit);

  if (options?.userId) {
    query = query.eq("id", options.userId);
  }

  const { data: rows, error } = await query;
  if (error) {
    return { applied: 0, errors: [error.message] };
  }

  let applied = 0;
  const errors: string[] = [];

  for (const row of rows ?? []) {
    const pendingPlan = normalizeDbPlan(row.pending_plan);
    const pendingBilling =
      row.pending_billing_period && isBillingPeriod(row.pending_billing_period)
        ? row.pending_billing_period
        : "monthly";
    const effectiveRaw = row.pending_plan_effective_at
      ? new Date(row.pending_plan_effective_at)
      : now;
    const effectiveAt = Number.isNaN(effectiveRaw.getTime()) ? now : effectiveRaw;

    // Seguridad: no “bajar” a un plan mayor o igual por datos corruptos.
    if (compareDbPlans(row.plan, pendingPlan) !== "downgrade") {
      const { error: clearError } = await admin
        .from("profiles")
        .update(clearPendingPlanFields())
        .eq("id", row.id);
      if (clearError) {
        errors.push(`${row.id}: ${clearError.message}`);
      }
      continue;
    }

    const patch = buildAppliedPlanPatch(
      pendingPlan,
      pendingPlan === "FREE" ? null : pendingBilling,
      effectiveAt,
    );

    const { error: updateError } = await admin
      .from("profiles")
      .update(patch)
      .eq("id", row.id)
      .eq("pending_plan", row.pending_plan);

    if (updateError) {
      errors.push(`${row.id}: ${updateError.message}`);
      continue;
    }

    applied += 1;
  }

  return { applied, errors };
}

export async function applyDuePendingPlanForUser(
  userId: string,
): Promise<boolean> {
  const result = await applyDuePendingPlanChanges({ userId, limit: 1 });
  return result.applied > 0;
}
