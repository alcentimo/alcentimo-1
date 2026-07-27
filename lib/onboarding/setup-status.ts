import type { StoreSettingsConfig } from "@/lib/store-settings/types";

export interface OnboardingSetupStatus {
  hasProducts: boolean;
  hasPaymentsConfigured: boolean;
  hasShippingConfigured: boolean;
  paymentsOrShippingConfigured: boolean;
  catalogPath: string;
}

/** Requisitos para desbloquear la prueba Pro de 30 días. */
export function isProTrialSetupComplete(
  status: Pick<OnboardingSetupStatus, "hasProducts" | "hasPaymentsConfigured">,
): boolean {
  return status.hasProducts && status.hasPaymentsConfigured;
}

export function getOnboardingSetupStatus(
  productCount: number,
  settings: StoreSettingsConfig,
  storeSlug: string,
): OnboardingSetupStatus {
  const hasPaymentsConfigured = Object.values(settings.payments.methods).some(
    (method) => method.enabled,
  );

  const hasShippingConfigured =
    Object.values(settings.shipping.carriers).some(Boolean) ||
    settings.shipping.deliveryZones.length > 0 ||
    settings.shipping.pickupPoints.length > 0 ||
    settings.shipping.deliveryDetails.trim().length > 0;

  return {
    hasProducts: productCount > 0,
    hasPaymentsConfigured,
    hasShippingConfigured,
    paymentsOrShippingConfigured: hasPaymentsConfigured || hasShippingConfigured,
    catalogPath: `/tienda/${storeSlug}`,
  };
}
