import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  buildPlanPricingTiers,
  DEFAULT_PLAN_SETTINGS,
  parsePlanSettingsRows,
  type PlanSettingsMap,
} from "@/lib/plans/plan-settings";
import type { PlanPricingTier } from "@/src/config/plan-pricing-ui";

function cloneDefaults(): PlanSettingsMap {
  return {
    FREE: { ...DEFAULT_PLAN_SETTINGS.FREE },
    PRO: { ...DEFAULT_PLAN_SETTINGS.PRO },
    BUSINESS: { ...DEFAULT_PLAN_SETTINGS.BUSINESS },
    ENTERPRISE: { ...DEFAULT_PLAN_SETTINGS.ENTERPRISE },
  };
}

/**
 * Lee public.plan_settings. Si falla o falta alguna fila, completa con defaults.
 * Cacheado por request (React cache). Solo servidor.
 */
export const fetchPlanSettings = cache(async (): Promise<PlanSettingsMap> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("plan_settings")
      .select(
        "plan_key, display_name, monthly_usd, annual_usd, product_limit, user_limit, included_locations, extra_location_monthly_usd",
      );

    if (error || !data?.length) {
      // Fallback sin columnas nuevas (migración 063 pendiente).
      const { data: legacy, error: legacyError } = await supabase
        .from("plan_settings")
        .select(
          "plan_key, display_name, monthly_usd, annual_usd, product_limit, user_limit",
        );
      if (legacyError || !legacy?.length) return cloneDefaults();
      return parsePlanSettingsRows(legacy);
    }

    return parsePlanSettingsRows(data);
  } catch {
    return cloneDefaults();
  }
});

export async function fetchPlanPricingTiers(): Promise<PlanPricingTier[]> {
  const settings = await fetchPlanSettings();
  return buildPlanPricingTiers(settings);
}
