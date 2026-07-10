import type {
  PaymentMethodKey,
  ShippingCarrierKey,
  StoreSettingsConfig,
} from "@/lib/store-settings/types";

const SHIPPING_LABELS: Record<ShippingCarrierKey, string> = {
  mrw: "MRW",
  tealca: "Tealca",
  zoom: "Zoom",
  domesa: "Domesa",
  delivery: "Delivery",
  pickup: "Retiro en tienda",
};

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

export function buildPublicPurchaseInfo(
  config: StoreSettingsConfig,
): PublicPurchaseInfo {
  const shipping = (Object.keys(SHIPPING_LABELS) as ShippingCarrierKey[])
    .filter((key) => config.shipping.carriers[key])
    .map((key) => ({
      key,
      label: SHIPPING_LABELS[key],
      details:
        key === "delivery" && config.shipping.deliveryDetails.trim()
          ? config.shipping.deliveryDetails.trim()
          : undefined,
    }));

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
