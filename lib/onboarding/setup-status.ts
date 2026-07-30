import type { StoreSettingsConfig } from "@/lib/store-settings/types";
import { getTransactionalCatalogUrl } from "@/lib/stores";

/** Mínimo de productos activos para reclamar la prueba Pro ($8 / Plan Pro). */
export const PRO_TRIAL_MIN_ACTIVE_PRODUCTS = 10;

export interface OnboardingSetupStatus {
  hasProducts: boolean;
  /** ≥ {@link PRO_TRIAL_MIN_ACTIVE_PRODUCTS} productos activos (requisito de prueba Pro). */
  hasMinProductsForProTrial: boolean;
  hasPaymentsConfigured: boolean;
  hasShippingConfigured: boolean;
  paymentsOrShippingConfigured: boolean;
  catalogPath: string;
}

export type ProTrialSetupPick = Pick<
  OnboardingSetupStatus,
  | "hasMinProductsForProTrial"
  | "hasPaymentsConfigured"
  | "hasShippingConfigured"
>;

/** Requisitos para desbloquear la prueba Pro de 30 días. */
export function isProTrialSetupComplete(status: ProTrialSetupPick): boolean {
  return (
    status.hasMinProductsForProTrial &&
    status.hasPaymentsConfigured &&
    status.hasShippingConfigured
  );
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
    hasMinProductsForProTrial: productCount >= PRO_TRIAL_MIN_ACTIVE_PRODUCTS,
    hasPaymentsConfigured,
    hasShippingConfigured,
    paymentsOrShippingConfigured: hasPaymentsConfigured || hasShippingConfigured,
    catalogPath: getTransactionalCatalogUrl(storeSlug),
  };
}
