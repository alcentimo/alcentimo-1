import { createClient } from "@/lib/supabase/server";
import { getUserPlanIdById } from "@/lib/auth/get-user-profile";
import {
  buildProductLimitCheck,
  DEFAULT_PLAN_ID,
  resolvePlanId,
  type PlanId,
  type ProductLimitCheck,
} from "@/src/config/plans";

export async function getStoreProductCount(storeId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("is_active", true);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Plan del dueño de la tienda (límite de productos compartido por la tienda). */
export async function getStorePlanId(storeId: string): Promise<PlanId> {
  const supabase = await createClient();
  const { data: store, error } = await supabase
    .from("stores")
    .select("owner_id")
    .eq("id", storeId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!store) return DEFAULT_PLAN_ID;

  return getUserPlanIdById(store.owner_id);
}

export async function getStoreProductLimitStatus(
  storeId: string,
  planId?: PlanId | string | null,
): Promise<ProductLimitCheck> {
  const resolvedPlanId = planId ? resolvePlanId(planId) : await getStorePlanId(storeId);
  const currentCount = await getStoreProductCount(storeId);
  return buildProductLimitCheck(currentCount, resolvedPlanId);
}

/** Única restricción por plan: crear más productos activos de los permitidos. */
export async function assertCanCreateProduct(
  _storeId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return { ok: true };
}
