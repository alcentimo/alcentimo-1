import { createClient } from "@/lib/supabase/server";
import { getUserPlanIdById, getUserProfile } from "@/lib/auth/get-user-profile";
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

/** Plan del dueño de la tienda (límite de productos compartido por la tienda). */
export async function getStorePlanId(storeId: string): Promise<PlanId> {
  const ownerId = await getStoreOwnerId(storeId);
  if (!ownerId) return DEFAULT_PLAN_ID;
  return getUserPlanIdById(ownerId);
}

export async function getStoreOwnerTrialStatus(
  storeId: string,
): Promise<ProTrialStatus> {
  const ownerId = await getStoreOwnerId(storeId);
  if (!ownerId) {
    return resolveProTrialStatus(null);
  }

  const supabase = await createClient();
  const profile = await getUserProfile(supabase, ownerId);
  return resolveProTrialStatus(profile);
}

export async function getStoreProductLimitContext(
  storeId: string,
  planId?: PlanId | string | null,
): Promise<StoreProductLimitContext> {
  const resolvedPlanId = planId
    ? resolvePlanId(planId)
    : await getStorePlanId(storeId);
  const trial = await getStoreOwnerTrialStatus(storeId);
  const effectivePlanId = getEffectivePlanIdForLimits(resolvedPlanId, trial);
  const currentCount = await getStoreProductCount(storeId);
  const check = buildProductLimitCheck(currentCount, effectivePlanId);

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

  if (context.canCreateMore) {
    return { ok: true };
  }

  return {
    ok: false,
    error: getProductLimitErrorMessage(context, context.trial),
    code: "PRODUCT_LIMIT",
    trialEligible: context.trial.eligible,
  };
}
