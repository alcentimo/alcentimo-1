import {
  getShippingMethod,
  LOCAL_SHIPPING_METHODS,
  NATIONAL_CARRIER_METHODS,
} from "@/src/config/shipping-methods";
import type {
  PaymentMethodKey,
  ShippingCarrierKey,
  StoreSettingsConfig,
} from "@/lib/store-settings/types";

const PAYMENT_LABELS: Record<PaymentMethodKey, string> = {
  pagoMovil: "Pago Móvil",
  zelle: "Zelle",
  cashea: "Cashea",
  transferencia: "Transferencia bancaria",
  efectivoUsd: "Efectivo USD",
  puntoVenta: "Punto de venta",
};

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
  whatsappPhone: string;
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

  const payments = (Object.keys(PAYMENT_LABELS) as PaymentMethodKey[])
    .filter((key) => config.payments.methods[key].enabled)
    .map((key) => ({
      key,
      label: PAYMENT_LABELS[key],
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
  };
}
