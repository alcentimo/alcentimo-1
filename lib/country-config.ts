import type { StoreCountryOption } from "@/lib/onboarding/countries";
import { isStoreCountryOption } from "@/lib/onboarding/countries";
import type { PaymentMethodKey } from "@/lib/store-settings/types";
import type { ShippingCarrierKey } from "@/lib/store-settings/types";
import type { SalesPaymentMethodKey } from "@/src/config/sales-payment-methods";
import { PAYMENT_METHOD_GROUPS, COLOMBIA_PAYMENT_METHOD_GROUPS } from "@/src/config/payment-methods";
import { SHIPPING_METHODS } from "@/src/config/shipping-methods";
import { SALES_PAYMENT_METHODS } from "@/src/config/sales-payment-methods";

export type CountryCurrencyCode = "USD" | "VES" | "COP" | "ARS";

export interface CountryCurrencyConfig {
  /** Moneda en la que se guardan los precios (schema actual: USD). */
  baseCurrency: "USD";
  baseCurrencyLabel: string;
  /** Moneda local mostrada al comercio cuando hay tasa disponible. */
  localCurrency: CountryCurrencyCode;
  localCurrencyLabel: string;
  locale: string;
  /** Muestra columna de equivalente local (ej. Bs, COP, ARS). */
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

const COLOMBIA_PAYMENTS: PaymentMethodKey[] = [
  "pse",
  "tarjetas",
  "nequi",
  "daviplata",
  "efectyBaloto",
];

const COLOMBIA_SHIPPING: ShippingCarrierKey[] = [
  "servientrega",
  "interRapidisimo",
  "coordinadora",
  "enviame",
  "mipaquete",
  "delivery",
  "pickup",
];

const ARGENTINA_PAYMENTS: PaymentMethodKey[] = [
  "transferencia",
  "efectivoUsd",
  "puntoVenta",
  "paypal",
  "binance",
  "crypto",
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

/** Argentina: envío local sin carriers nacionales VE. */
const ARGENTINA_LOCAL_SHIPPING: ShippingCarrierKey[] = ["delivery", "pickup"];
const ARGENTINA_SHIPPING = ARGENTINA_LOCAL_SHIPPING;

const VENEZUELA_SALES_PAYMENTS: SalesPaymentMethodKey[] = [
  "efectivo",
  "transferencia",
  "pago_movil",
  "divisa",
  "zelle",
  "punto_venta",
  "otro",
];

const COLOMBIA_SALES_PAYMENTS: SalesPaymentMethodKey[] = [
  "pse",
  "tarjeta",
  "nequi",
  "daviplata",
  "efecty_baloto",
  "otro",
];

const ARGENTINA_SALES_PAYMENTS: SalesPaymentMethodKey[] = [
  "efectivo",
  "transferencia",
  "mercado_pago",
  "tarjeta",
  "otro",
];

export const COUNTRY_CONFIGS: Record<StoreCountryOption, CountryConfig> = {
  Venezuela: {
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
  },
  Colombia: {
    country: "Colombia",
    currency: {
      baseCurrency: "USD",
      baseCurrencyLabel: "Precio base USD",
      localCurrency: "COP",
      localCurrencyLabel: "Referencia en COP",
      locale: "es-CO",
      showLocalEquivalent: false,
      salesTotalLabel: "Total (USD)",
    },
    paymentMethodKeys: COLOMBIA_PAYMENTS,
    shippingCarrierKeys: COLOMBIA_SHIPPING,
    salesPaymentMethodKeys: COLOMBIA_SALES_PAYMENTS,
  },
  Argentina: {
    country: "Argentina",
    currency: {
      baseCurrency: "USD",
      baseCurrencyLabel: "Precio base USD",
      localCurrency: "ARS",
      localCurrencyLabel: "Referencia en ARS",
      locale: "es-AR",
      showLocalEquivalent: false,
      salesTotalLabel: "Total (USD)",
    },
    paymentMethodKeys: ARGENTINA_PAYMENTS,
    shippingCarrierKeys: ARGENTINA_SHIPPING,
    salesPaymentMethodKeys: ARGENTINA_SALES_PAYMENTS,
  },
};

export const DEFAULT_STORE_COUNTRY: StoreCountryOption = "Venezuela";

/** Normaliza el valor persistido en `stores.country` (incluye tiendas legacy sin país). */
export function resolveStoreCountry(
  country: string | null | undefined,
): StoreCountryOption {
  if (country && isStoreCountryOption(country)) return country;
  return DEFAULT_STORE_COUNTRY;
}

export function getCountryConfig(country: StoreCountryOption): CountryConfig {
  return COUNTRY_CONFIGS[country];
}

export function getPaymentMethodKeysForCountry(
  country: StoreCountryOption,
): PaymentMethodKey[] {
  return [...getCountryConfig(country).paymentMethodKeys];
}

export function getShippingCarrierKeysForCountry(
  country: StoreCountryOption,
): ShippingCarrierKey[] {
  return [...getCountryConfig(country).shippingCarrierKeys];
}

export function getSalesPaymentMethodKeysForCountry(
  country: StoreCountryOption,
): SalesPaymentMethodKey[] {
  return [...getCountryConfig(country).salesPaymentMethodKeys];
}

export function getPaymentGroupsForCountry(country: StoreCountryOption) {
  if (country === "Colombia") {
    return COLOMBIA_PAYMENT_METHOD_GROUPS;
  }

  const allowed = new Set(getCountryConfig(country).paymentMethodKeys);
  return PAYMENT_METHOD_GROUPS.map((group) => ({
    ...group,
    keys: group.keys.filter((key) => allowed.has(key)),
  })).filter((group) => group.keys.length > 0);
}

export function getShippingMethodsForCountry(country: StoreCountryOption) {
  const allowed = new Set(getCountryConfig(country).shippingCarrierKeys);
  return SHIPPING_METHODS.filter((method) => allowed.has(method.key));
}

export function getNationalCarriersForCountry(country: StoreCountryOption) {
  return getShippingMethodsForCountry(country).filter(
    (method) => method.category === "carrier",
  );
}

export function getLocalShippingForCountry(country: StoreCountryOption) {
  return getShippingMethodsForCountry(country).filter(
    (method) => method.category === "local",
  );
}

export function getSalesPaymentMethodsForCountry(country: StoreCountryOption) {
  const allowed = new Set(getCountryConfig(country).salesPaymentMethodKeys);
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
