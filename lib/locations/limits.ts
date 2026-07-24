import type { PlanId } from "@/src/config/plans";
import type { PlanSettingsMap } from "@/lib/plans/plan-settings";
import { DEFAULT_PLAN_SETTINGS, planIdToSettingsKey } from "@/lib/plans/plan-settings";

/** Techo técnico absoluto (también en trigger SQL). */
export const ABSOLUTE_MAX_STORE_LOCATIONS = 20;

/** Compatibilidad con código previo. */
export const MAX_STORE_LOCATIONS = ABSOLUTE_MAX_STORE_LOCATIONS;

export interface LocationLimitInfo {
  planId: PlanId;
  includedLocations: number;
  extraAuthorized: number;
  maxAllowed: number;
  extraLocationMonthlyUsd: number;
  canAddMore: boolean;
  remainingSlots: number;
  /** Sucursales activas que exceden las incluidas en el plan. */
  billableExtraCount: number;
  /** Costo mensual total por sucursales extra en uso. */
  monthlyExtraCostUsd: number;
  /** La próxima sucursal a crear requeriría cargo extra. */
  nextBranchRequiresExtra: boolean;
  /** Costo mensual de la próxima sucursal extra (+$6 por defecto). */
  nextBranchMonthlyCostUsd: number;
}

export function computeExtraLocationBilling(options: {
  currentCount: number;
  includedLocations: number;
  extraLocationMonthlyUsd: number;
}): Pick<
  LocationLimitInfo,
  | "billableExtraCount"
  | "monthlyExtraCostUsd"
  | "nextBranchRequiresExtra"
  | "nextBranchMonthlyCostUsd"
> {
  const billableExtraCount = Math.max(
    0,
    options.currentCount - options.includedLocations,
  );
  const nextBranchRequiresExtra =
    options.currentCount >= options.includedLocations;
  const nextBranchMonthlyCostUsd = nextBranchRequiresExtra
    ? options.extraLocationMonthlyUsd
    : 0;

  return {
    billableExtraCount,
    monthlyExtraCostUsd: billableExtraCount * options.extraLocationMonthlyUsd,
    nextBranchRequiresExtra,
    nextBranchMonthlyCostUsd,
  };
}

export function getIncludedLocationsForPlan(
  planId: PlanId,
  settings: PlanSettingsMap = DEFAULT_PLAN_SETTINGS,
): number {
  const key = planIdToSettingsKey(planId);
  const fromSettings = settings[key]?.includedLocations;
  if (typeof fromSettings === "number" && fromSettings >= 1) {
    return fromSettings;
  }
  if (planId === "enterprise") return 3;
  return 1;
}

export function getExtraLocationMonthlyUsd(
  settings: PlanSettingsMap = DEFAULT_PLAN_SETTINGS,
): number {
  return settings.ENTERPRISE?.extraLocationMonthlyUsd ?? 6;
}

export function resolveLocationLimit(options: {
  planId: PlanId;
  extraAuthorized?: number | null;
  currentCount: number;
  settings?: PlanSettingsMap;
}): LocationLimitInfo {
  const settings = options.settings ?? DEFAULT_PLAN_SETTINGS;
  const includedLocations = getIncludedLocationsForPlan(options.planId, settings);
  const extraAuthorized = Math.max(0, Math.floor(options.extraAuthorized ?? 0));
  const maxAllowed = Math.min(
    ABSOLUTE_MAX_STORE_LOCATIONS,
    includedLocations + extraAuthorized,
  );
  const remainingSlots = Math.max(0, maxAllowed - options.currentCount);
  const extraLocationMonthlyUsd = getExtraLocationMonthlyUsd(settings);
  const billing = computeExtraLocationBilling({
    currentCount: options.currentCount,
    includedLocations,
    extraLocationMonthlyUsd,
  });

  return {
    planId: options.planId,
    includedLocations,
    extraAuthorized,
    maxAllowed,
    extraLocationMonthlyUsd,
    canAddMore: remainingSlots > 0,
    remainingSlots,
    ...billing,
  };
}
