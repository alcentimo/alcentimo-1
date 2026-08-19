import type { StoreSettingsConfig } from "@/lib/store-settings/types";
import { getTransactionalCatalogUrl } from "@/lib/stores";
import { applyPlatformShippingToStoreConfig } from "@/lib/platform/dropship-shipping";

export interface OnboardingSetupStatus {
  hasProducts: boolean;
  hasPaymentsConfigured: boolean;
  hasShippingConfigured: boolean;
  paymentsOrShippingConfigured: boolean;
  catalogPath: string;
}

export function getOnboardingSetupStatus(
  productCount: number,
  settings: StoreSettingsConfig,
  storeSlug: string,
): OnboardingSetupStatus {
  const hasPaymentsConfigured = Object.values(settings.payments.methods).some(
    (method) => method.enabled,
  );

  const overlayed = applyPlatformShippingToStoreConfig(settings);
  const hasShippingConfigured =
    Object.values(overlayed.shipping.carriers).some(Boolean) ||
    overlayed.shipping.deliveryZones.length > 0 ||
    overlayed.shipping.pickupPoints.length > 0 ||
    overlayed.shipping.deliveryDetails.trim().length > 0;

  return {
    hasProducts: productCount > 0,
    hasPaymentsConfigured,
    hasShippingConfigured,
    paymentsOrShippingConfigured: hasPaymentsConfigured || hasShippingConfigured,
    catalogPath: getTransactionalCatalogUrl(storeSlug),
  };
}
