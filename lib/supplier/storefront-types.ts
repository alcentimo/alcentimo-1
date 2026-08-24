import {
  defaultStoreSettingsConfig,
  normalizeStoreSettingsConfig,
} from "@/lib/store-settings/defaults";
import type {
  PaymentsSettings,
  ShippingSettings,
} from "@/lib/store-settings/types";

export type SupplierStorefrontConfig = {
  shipping: ShippingSettings;
  payments: PaymentsSettings;
};

export function defaultSupplierStorefrontConfig(): SupplierStorefrontConfig {
  const defaults = defaultStoreSettingsConfig();
  return {
    shipping: defaults.shipping,
    payments: defaults.payments,
  };
}

export function normalizeSupplierStorefrontConfig(
  raw: unknown,
): SupplierStorefrontConfig {
  const source =
    typeof raw === "object" && raw !== null && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const normalized = normalizeStoreSettingsConfig({
    shipping: source.shipping,
    payments: source.payments,
  });
  return {
    shipping: normalized.shipping,
    payments: normalized.payments,
  };
}

export type SupplierStorefrontIdentity = {
  tradeName: string;
  description: string;
  logoUrl: string | null;
};

export type SupplierPublicStorefront = {
  userId: string;
  companyName: string;
  tradeName: string;
  description: string;
  logoUrl: string | null;
  showPublicCatalog: boolean;
  publicCatalogSlug: string | null;
  shipping: ShippingSettings;
  payments: PaymentsSettings;
};
