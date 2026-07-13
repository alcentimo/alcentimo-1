import {
  DEFAULT_STORE_COUNTRY,
  type StoreCountryOption,
} from "@/lib/onboarding/countries";
import type { PaymentMethodKey } from "@/lib/store-settings/types";
import type { ShippingCarrierKey } from "@/lib/store-settings/types";
import type { SalesPaymentMethodKey } from "@/src/config/sales-payment-methods";
import { PAYMENT_METHOD_GROUPS } from "@/src/config/payment-methods";
import { SHIPPING_METHODS } from "@/src/config/shipping-methods";
import { SALES_PAYMENT_METHODS } from "@/src/config/sales-payment-methods";

export type CountryCurrencyCode = "USD" | "VES";

export interface CountryCurrencyConfig {
  /** Moneda en la que se guardan los precios (schema actual: USD). */
  baseCurrency: "USD";
  baseCurrencyLabel: string;
  /** Moneda local mostrada al comercio cuando hay tasa disponible. */
  localCurrency: CountryCurrencyCode;
  localCurrencyLabel: string;
  locale: string;
  /** Muestra columna de equivalente local (ej. Bs). */
  showLocalEquivalent: boolean;
  salesTotalLabel: string;
}

export interface CountryConfig {
  country: StoreCountryOption;
  currency: CountryCurrencyConfig;
  paymentMethodKeys: readonly PaymentMethodKey[];
  shippingCarrierKeys: readonly ShippingCarrierKey[];
  salesPaymentMethodKeys: readonly SalesPaymentMethodKey[];
}

const VENEZUELA_PAYMENTS: PaymentMethodKey[] = [
  "pagoMovil",
  "transferencia",
  "zelle",
  "efectivoUsd",
  "puntoVenta",
  "paypal",
  "binance",
  "crypto",
  "cashea",
];

const VENEZUELA_SHIPPING: ShippingCarrierKey[] = [
  "mrw",
  "tealca",
  "zoom",
  "domesa",
  "libertyExpress",
  "delivery",
  "pickup",
];

const VENEZUELA_SALES_PAYMENTS: SalesPaymentMethodKey[] = [
  "efectivo",
  "transferencia",
  "pago_movil",
  "divisa",
  "zelle",
  "punto_venta",
  "otro",
];

export const COUNTRY_CONFIG: CountryConfig = {
  country: "Venezuela",
  currency: {
    baseCurrency: "USD",
    baseCurrencyLabel: "Precio base USD",
    localCurrency: "VES",
    localCurrencyLabel: "Equivalente en Bs",
    locale: "es-VE",
    showLocalEquivalent: true,
    salesTotalLabel: "Total (USD)",
  },
  paymentMethodKeys: VENEZUELA_PAYMENTS,
  shippingCarrierKeys: VENEZUELA_SHIPPING,
  salesPaymentMethodKeys: VENEZUELA_SALES_PAYMENTS,
};

export { DEFAULT_STORE_COUNTRY };

/** Normaliza el valor persistido en `stores.country` (incluye tiendas legacy sin país). */
export function resolveStoreCountry(
  _country: string | null | undefined,
): StoreCountryOption {
  return DEFAULT_STORE_COUNTRY;
}

export function getCountryConfig(
  _country?: StoreCountryOption,
): CountryConfig {
  return COUNTRY_CONFIG;
}

export function getPaymentMethodKeysForCountry(
  _country?: StoreCountryOption,
): PaymentMethodKey[] {
  return [...COUNTRY_CONFIG.paymentMethodKeys];
}

export function getShippingCarrierKeysForCountry(
  _country?: StoreCountryOption,
): ShippingCarrierKey[] {
  return [...COUNTRY_CONFIG.shippingCarrierKeys];
}

export function getSalesPaymentMethodKeysForCountry(
  _country?: StoreCountryOption,
): SalesPaymentMethodKey[] {
  return [...COUNTRY_CONFIG.salesPaymentMethodKeys];
}

export function getPaymentGroupsForCountry(_country?: StoreCountryOption) {
  const allowed = new Set(COUNTRY_CONFIG.paymentMethodKeys);
  return PAYMENT_METHOD_GROUPS.map((group) => ({
    ...group,
    keys: group.keys.filter((key) => allowed.has(key)),
  })).filter((group) => group.keys.length > 0);
}

export function getShippingMethodsForCountry(_country?: StoreCountryOption) {
  const allowed = new Set(COUNTRY_CONFIG.shippingCarrierKeys);
  return SHIPPING_METHODS.filter((method) => allowed.has(method.key));
}

export function getNationalCarriersForCountry(_country?: StoreCountryOption) {
  return getShippingMethodsForCountry().filter(
    (method) => method.category === "carrier",
  );
}

export function getLocalShippingForCountry(_country?: StoreCountryOption) {
  return getShippingMethodsForCountry().filter(
    (method) => method.category === "local",
  );
}

export function getSalesPaymentMethodsForCountry(_country?: StoreCountryOption) {
  const allowed = new Set(COUNTRY_CONFIG.salesPaymentMethodKeys);
  return SALES_PAYMENT_METHODS.filter((method) => allowed.has(method.key));
}

export function formatCountryCurrency(
  amount: number | null | undefined,
  currency: CountryCurrencyCode,
  locale: string,
): string {
  if (amount == null || !Number.isFinite(amount)) return "—";

  if (currency === "VES") {
    return `Bs. ${new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`;
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
