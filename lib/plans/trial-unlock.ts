import { PLANS } from "@/src/config/plans";

/** Código que el usuario debe escribir para reclamar la prueba Pro. */
export const PRO_TRIAL_UNLOCK_CODE = "ALCENTIMO";

/** Productos mínimos en catálogo para desbloquear la prueba (plan Gratis). */
export const PRO_TRIAL_UNLOCK_PRODUCT_COUNT = PLANS.free.productLimit as number;

export function normalizeTrialClaimCode(input: string): string {
  return input.trim().toUpperCase();
}

export function isProTrialClaimCodeValid(input: string): boolean {
  return normalizeTrialClaimCode(input) === PRO_TRIAL_UNLOCK_CODE;
}

export function isProTrialUnlockReady(
  currentCount: number,
  unlockTarget = PRO_TRIAL_UNLOCK_PRODUCT_COUNT,
): boolean {
  return currentCount >= unlockTarget;
}

export function getProTrialProgressPercent(
  currentCount: number,
  unlockTarget = PRO_TRIAL_UNLOCK_PRODUCT_COUNT,
): number {
  if (unlockTarget <= 0) return 100;
  return Math.min(100, Math.round((currentCount / unlockTarget) * 100));
}

export function getProTrialProductsRemaining(
  currentCount: number,
  unlockTarget = PRO_TRIAL_UNLOCK_PRODUCT_COUNT,
): number {
  return Math.max(0, unlockTarget - currentCount);
}
