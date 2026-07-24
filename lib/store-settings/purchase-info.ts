import {
  getShippingMethod,
  LOCAL_SHIPPING_METHODS,
  NATIONAL_CARRIER_METHODS,
} from "@/src/config/shipping-methods";
import { getPaymentMethod, PAYMENT_METHODS } from "@/src/config/payment-methods";
import type {
  DeliveryMeetingPoint,
  DeliveryZone,
  LocationHoursSettings,
  PaymentMethodKey,
  ShippingCarrierKey,
  StoreSettingsConfig,
} from "@/lib/store-settings/types";

const PAYMENT_METHOD_KEYS = PAYMENT_METHODS.map((method) => method.key);

export interface PublicShippingOption {
  key: ShippingCarrierKey;
  label: string;
  description: string;
  estimatedTime?: string;
  details?: string;
}

export interface PublicPaymentOption {
  key: PaymentMethodKey;
  label: string;
  fields: Record<string, string>;
}

export interface PublicPurchaseInfo {
  shipping: PublicShippingOption[];
  payments: PublicPaymentOption[];
  installments: {
    enabled: boolean;
    minUsd: string;
    maxInstallments: string;
    conditions: string;
  } | null;
  /** Número principal para wa.me / pedidos. */
  whatsappPhone: string;
  /** Hasta 3 números configurados para recepción de pedidos. */
  whatsappPhones: string[];
  locationHours: LocationHoursSettings;
  deliveryZones: DeliveryZone[];
  pickupPoints: DeliveryMeetingPoint[];
}

function buildShippingOption(
  key: ShippingCarrierKey,
  config: StoreSettingsConfig,
): PublicShippingOption {
  const method = getShippingMethod(key);
  const deliveryDetails =
    key === "delivery" && config.shipping.deliveryDetails.trim()
      ? config.shipping.deliveryDetails.trim()
      : undefined;

  return {
    key,
    label: method.label,
    description: method.description,
    estimatedTime: method.estimatedTime,
    details: deliveryDetails,
  };
}

export function buildPublicPurchaseInfo(
  config: StoreSettingsConfig,
): PublicPurchaseInfo {
  const carrierKeys = [
    ...NATIONAL_CARRIER_METHODS.map((m) => m.key),
    ...LOCAL_SHIPPING_METHODS.map((m) => m.key),
  ] as ShippingCarrierKey[];

  const shipping = carrierKeys
    .filter((key) => config.shipping.carriers[key])
    .map((key) => buildShippingOption(key, config));

  const payments = PAYMENT_METHOD_KEYS.filter(
    (key) => config.payments.methods[key].enabled,
  ).map((key) => ({
    key,
    label: getPaymentMethod(key).label,
    fields: config.payments.methods[key].fields,
  }));

  const installments = config.payments.installments.enabled
    ? config.payments.installments
    : null;

  return {
    shipping,
    payments,
    installments,
    whatsappPhone: config.contact.whatsappPhone.trim(),
    whatsappPhones: config.contact.whatsappPhones
      .map((phone) => phone.trim())
      .filter(Boolean),
    locationHours: config.locationHours,
    deliveryZones: config.shipping.deliveryZones,
    pickupPoints: config.shipping.pickupPoints,
  };
}
