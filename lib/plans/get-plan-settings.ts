import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  buildPlanPricingTiers,
  DEFAULT_PLAN_SETTINGS,
  parsePlanSettingsRows,
  type PlanSettingsMap,
} from "@/lib/plans/plan-settings";
import type { PlanPricingTier } from "@/src/config/plan-pricing-ui";

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
        "plan_key, display_name, monthly_usd, annual_usd, product_limit, user_limit",
      );

    if (error || !data?.length) {
      return {
        FREE: { ...DEFAULT_PLAN_SETTINGS.FREE },
        PRO: { ...DEFAULT_PLAN_SETTINGS.PRO },
        BUSINESS: { ...DEFAULT_PLAN_SETTINGS.BUSINESS },
      };
    }

    return parsePlanSettingsRows(data);
  } catch {
    return {
      FREE: { ...DEFAULT_PLAN_SETTINGS.FREE },
      PRO: { ...DEFAULT_PLAN_SETTINGS.PRO },
      BUSINESS: { ...DEFAULT_PLAN_SETTINGS.BUSINESS },
    };
  }
});

export async function fetchPlanPricingTiers(): Promise<PlanPricingTier[]> {
  const settings = await fetchPlanSettings();
  return buildPlanPricingTiers(settings);
}
