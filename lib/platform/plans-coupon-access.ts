import { fetchPlatformSettings } from "@/lib/platform/get-platform-settings";

export async function getPlansCouponBoxEnabled(): Promise<boolean> {
  const settings = await fetchPlatformSettings();
  return settings.plansCouponBoxEnabled;
}

export async function assertPlansCouponRedemptionAllowed(): Promise<{
  error?: string;
}> {
  if (!(await getPlansCouponBoxEnabled())) {
    return {
      error: "El canje de cupones no está disponible en este momento.",
    };
  }
  return {};
}
