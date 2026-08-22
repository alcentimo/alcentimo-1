import { NATIONAL_CARRIER_METHODS } from "@/src/config/shipping-methods";
import type {
  ShippingCarrierKey,
  ShippingPricingMode,
  ShippingSettings,
  StoreSettingsConfig,
} from "@/lib/store-settings/types";

export type PlatformNationalCarrierKey = Exclude<
  ShippingCarrierKey,
  "delivery" | "pickup"
>;

export type PlatformDropshipShippingCarriers = Record<
  PlatformNationalCarrierKey,
  boolean
>;

export interface PlatformDropshipShippingSettings {
  carriers: PlatformDropshipShippingCarriers;
  pricingMode: ShippingPricingMode;
  flatRateUsd: number;
  freeShippingEnabled: boolean;
  freeShippingMinUsd: number;
}

const NATIONAL_CARRIER_KEYS = NATIONAL_CARRIER_METHODS.map(
  (method) => method.key,
) as PlatformNationalCarrierKey[];

export const DEFAULT_PLATFORM_DROPSHIP_SHIPPING: PlatformDropshipShippingSettings =
  {
    carriers: {
      mrw: true,
      zoom: true,
      tealca: false,
      domesa: false,
      libertyExpress: false,
    },
    pricingMode: "cod",
    flatRateUsd: 3,
    freeShippingEnabled: false,
    freeShippingMinUsd: 25,
  };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeUsdAmount(value: unknown, fallback: number): number {
  const raw =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(raw) || raw < 0) return fallback;
  return Math.round(raw * 100) / 100;
}

export function normalizePlatformDropshipShipping(
  raw: unknown,
): PlatformDropshipShippingSettings {
  const parsed =
    typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw) as unknown;
          } catch {
            return null;
          }
        })()
      : raw;

  const source = isRecord(parsed) ? parsed : {};
  const carriersRaw = isRecord(source.carriers) ? source.carriers : {};
  const carriers = { ...DEFAULT_PLATFORM_DROPSHIP_SHIPPING.carriers };

  for (const key of NATIONAL_CARRIER_KEYS) {
    if (typeof carriersRaw[key] === "boolean") {
      carriers[key] = carriersRaw[key];
    }
  }

  return {
    carriers,
    pricingMode:
      source.pricingMode === "flat" || source.pricingMode === "cod"
        ? source.pricingMode
        : DEFAULT_PLATFORM_DROPSHIP_SHIPPING.pricingMode,
    flatRateUsd: normalizeUsdAmount(
      source.flatRateUsd,
      DEFAULT_PLATFORM_DROPSHIP_SHIPPING.flatRateUsd,
    ),
    freeShippingEnabled:
      typeof source.freeShippingEnabled === "boolean"
        ? source.freeShippingEnabled
        : DEFAULT_PLATFORM_DROPSHIP_SHIPPING.freeShippingEnabled,
    freeShippingMinUsd: normalizeUsdAmount(
      source.freeShippingMinUsd,
      DEFAULT_PLATFORM_DROPSHIP_SHIPPING.freeShippingMinUsd,
    ),
  };
}

export function hasEnabledNationalCarrier(
  shipping: PlatformDropshipShippingSettings,
): boolean {
  return NATIONAL_CARRIER_KEYS.some((key) => shipping.carriers[key]);
}

export function validatePlatformDropshipShipping(
  shipping: PlatformDropshipShippingSettings,
): string | null {
  if (!hasEnabledNationalCarrier(shipping)) {
    return "Activa al menos una agencia nacional (MRW o Zoom).";
  }
  // freeShippingMinUsd === 0 con freeShippingEnabled = envío siempre gratis.
  if (
    shipping.freeShippingEnabled &&
    shipping.freeShippingMinUsd < 0
  ) {
    return "El monto mínimo de envío gratis no puede ser negativo.";
  }
  return null;
}

/** Superpone agencias nacionales y precios globales; conserva entrega local de la tienda. */
export function applyPlatformShippingToStoreConfig(
  config: StoreSettingsConfig,
  platformShipping: PlatformDropshipShippingSettings = DEFAULT_PLATFORM_DROPSHIP_SHIPPING,
): StoreSettingsConfig {
  return {
    ...config,
    shipping: applyPlatformShippingToStoreShipping(
      config.shipping,
      platformShipping,
    ),
  };
}

export function applyPlatformShippingToStoreShipping(
  shipping: ShippingSettings,
  platformShipping: PlatformDropshipShippingSettings = DEFAULT_PLATFORM_DROPSHIP_SHIPPING,
): ShippingSettings {
  const carriers = { ...shipping.carriers };
  for (const key of NATIONAL_CARRIER_KEYS) {
    carriers[key] = platformShipping.carriers[key];
  }

  return {
    ...shipping,
    carriers,
    pricingMode: platformShipping.pricingMode,
    flatRateUsd: platformShipping.flatRateUsd,
    freeShippingEnabled: platformShipping.freeShippingEnabled,
    freeShippingMinUsd: platformShipping.freeShippingMinUsd,
  };
}

/** El dropshipper solo puede editar entrega local; el resto lo define Alcéntimo. */
export function lockPlatformOwnedShippingFields(
  incoming: ShippingSettings,
  current: ShippingSettings,
): ShippingSettings {
  const carriers = { ...incoming.carriers };
  for (const key of NATIONAL_CARRIER_KEYS) {
    carriers[key] = current.carriers[key];
  }

  return {
    ...incoming,
    carriers,
    pricingMode: current.pricingMode,
    flatRateUsd: current.flatRateUsd,
    freeShippingEnabled: current.freeShippingEnabled,
    freeShippingMinUsd: current.freeShippingMinUsd,
  };
}
