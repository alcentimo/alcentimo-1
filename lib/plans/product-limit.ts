import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/database.types";
import {
  buildProductLimitCheck,
  DEFAULT_PLAN_ID,
  getProductLimitErrorMessage,
  resolvePlanId,
  type PlanId,
  type ProductLimitCheck,
} from "@/src/config/plans";
import {
  getEffectivePlanIdForLimits,
  resolveProTrialStatus,
  type ProTrialStatus,
} from "@/lib/plans/trial";
import {
  getProductLimitFromSettings,
} from "@/lib/plans/plan-settings";
import { fetchPlanSettings } from "@/lib/plans/get-plan-settings";

export interface StoreProductLimitContext extends ProductLimitCheck {
  trial: ProTrialStatus;
  effectivePlanId: PlanId;
}

export type AssertCanCreateProductResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      code: "PRODUCT_LIMIT";
      trialEligible: boolean;
    };

export async function getStoreProductCount(storeId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("is_active", true)
    .eq("is_deleted", false);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function getStoreOwnerId(storeId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stores")
    .select("owner_id")
    .eq("id", storeId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.owner_id ?? null;
}

async function getStoreOwnerProfile(
  ownerId: string,
): Promise<Pick<
  Profile,
  | "plan"
  | "subscription_status"
  | "pro_trial_started_at"
  | "pro_trial_ends_at"
  | "billing_period"
  | "subscription_period_started_at"
  | "subscription_period_ends_at"
  | "extra_locations_authorized"
> | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select(
      "plan, subscription_status, pro_trial_started_at, pro_trial_ends_at, billing_period, subscription_period_started_at, subscription_period_ends_at, extra_locations_authorized",
    )
    .eq("id", ownerId)
    .maybeSingle();

  if (error) {
    // Fallback si la migración 063 aún no está aplicada.
    const { data: fallback, error: fallbackError } = await admin
      .from("profiles")
      .select(
        "plan, subscription_status, pro_trial_started_at, pro_trial_ends_at, billing_period, subscription_period_started_at, subscription_period_ends_at",
      )
      .eq("id", ownerId)
      .maybeSingle();

    if (fallbackError) throw new Error(fallbackError.message);
    if (!fallback) return null;
    return { ...fallback, extra_locations_authorized: 0 };
  }

  return data;
}

/** Perfil del dueño de la tienda (plan real en BD, sin depender de RLS del usuario logueado). */
export async function getStoreOwnerPlanProfile(
  storeId: string,
): Promise<
  | (Pick<
      Profile,
      | "plan"
      | "subscription_status"
      | "pro_trial_started_at"
      | "pro_trial_ends_at"
      | "billing_period"
      | "subscription_period_started_at"
      | "subscription_period_ends_at"
      | "extra_locations_authorized"
    > & { ownerId: string })
  | null
> {
  noStore();
  const ownerId = await getStoreOwnerId(storeId);
  if (!ownerId) return null;

  const profile = await getStoreOwnerProfile(ownerId);
  if (!profile) return null;

  return { ownerId, ...profile };
}

/** Plan del dueño de la tienda (límite de productos compartido por la tienda). */
export async function getStorePlanId(storeId: string): Promise<PlanId> {
  const ownerId = await getStoreOwnerId(storeId);
  if (!ownerId) return DEFAULT_PLAN_ID;

  const profile = await getStoreOwnerProfile(ownerId);
  return resolvePlanId(profile?.plan);
}

export async function getStoreOwnerTrialStatus(
  storeId: string,
): Promise<ProTrialStatus> {
  const ownerId = await getStoreOwnerId(storeId);
  if (!ownerId) {
    return resolveProTrialStatus(null);
  }

  const profile = await getStoreOwnerProfile(ownerId);
  const planId = resolvePlanId(profile?.plan);
  return resolveProTrialStatus(profile, planId);
}

export async function getStoreProductLimitContext(
  storeId: string,
  planId?: PlanId | string | null,
): Promise<StoreProductLimitContext> {
  noStore();
  const resolvedPlanId = planId
    ? resolvePlanId(planId)
    : await getStorePlanId(storeId);
  const trial = await getStoreOwnerTrialStatus(storeId);
  const effectivePlanId = getEffectivePlanIdForLimits(resolvedPlanId, trial);
  const currentCount = await getStoreProductCount(storeId);
  const settings = await fetchPlanSettings();
  const productLimit = getProductLimitFromSettings(effectivePlanId, settings);
  const check = buildProductLimitCheck(currentCount, effectivePlanId, {
    productLimit,
  });

  return {
    ...check,
    trial,
    effectivePlanId,
  };
}

export async function getStoreProductLimitStatus(
  storeId: string,
  planId?: PlanId | string | null,
): Promise<ProductLimitCheck> {
  const context = await getStoreProductLimitContext(storeId, planId);
  return {
    planId: context.planId,
    planName: context.planName,
    currentCount: context.currentCount,
    productLimit: context.productLimit,
    canCreateMore: context.canCreateMore,
    hasReachedLimit: context.hasReachedLimit,
    remainingSlots: context.remainingSlots,
  };
}

/** Única restricción por plan: crear más productos activos de los permitidos. */
export async function assertCanCreateProduct(
  storeId: string,
): Promise<AssertCanCreateProductResult> {
  const context = await getStoreProductLimitContext(storeId);
  const settings = await fetchPlanSettings();

  if (context.canCreateMore) {
    return { ok: true };
  }

  return {
    ok: false,
    error: getProductLimitErrorMessage(context, {
      ...context.trial,
      productLimit: settings.PRO.productLimit,
    }),
    code: "PRODUCT_LIMIT",
    trialEligible: context.trial.eligible,
  };
}
