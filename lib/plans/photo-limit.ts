import { fetchPlanSettings } from "@/lib/plans/get-plan-settings";
import {
  getPhotoLimitFromSettings,
  resolvePhotoLimitCap,
} from "@/lib/plans/plan-settings";
import { getEffectivePlanIdForLimits } from "@/lib/plans/trial";
import {
  getStoreOwnerTrialStatus,
  getStorePlanId,
} from "@/lib/plans/product-limit";
import { resolvePlanId, type PlanId } from "@/src/config/plans";

/**
 * Límite efectivo de fotos por producto para la tienda
 * (plan del dueño + trial Pro).
 */
export async function resolveStorePhotoLimit(
  storeId: string,
  planId?: PlanId | string | null,
): Promise<number> {
  const resolvedPlanId = planId
    ? resolvePlanId(planId)
    : await getStorePlanId(storeId);
  const trial = await getStoreOwnerTrialStatus(storeId);
  const effectivePlanId = getEffectivePlanIdForLimits(resolvedPlanId, trial);
  const settings = await fetchPlanSettings();
  return resolvePhotoLimitCap(
    getPhotoLimitFromSettings(effectivePlanId, settings),
  );
}

export function getPhotoLimitErrorMessage(limit: number): string {
  return `Máximo ${limit} fotos por producto.`;
}
