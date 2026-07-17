import type {
  CatalogDesignSettings,
  PaymentMethodKey,
  ShippingCarrierKey,
  StoreSettingsConfig,
  WeekdayKey,
} from "@/lib/store-settings/types";
import { WEEKDAY_KEYS } from "@/lib/store-settings/types";
import { getDefaultPrimaryColorForRubro } from "@/lib/store-settings/catalog-theme";

const SHIPPING_CARRIER_KEYS: ShippingCarrierKey[] = [
  "mrw",
  "tealca",
  "zoom",
  "domesa",
  "libertyExpress",
  "delivery",
  "pickup",
];

const PAYMENT_METHOD_KEYS: PaymentMethodKey[] = [
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

function defaultWeekdaySchedule(): Record<WeekdayKey, { enabled: boolean }> {
  return Object.fromEntries(
    WEEKDAY_KEYS.map((key) => [
      key,
      { enabled: key !== "sun" },
    ]),
  ) as Record<WeekdayKey, { enabled: boolean }>;
}

const DEFAULT_PAYMENT_FIELDS: Record<PaymentMethodKey, Record<string, string>> = {
  pagoMovil: { bank: "", phone: "", ci: "", qrImageUrl: "" },
  zelle: { email: "", holder: "" },
  cashea: { merchantId: "" },
  transferencia: { bank: "", account: "", holder: "" },
  efectivoUsd: {},
  puntoVenta: { note: "" },
  paypal: { email: "" },
  binance: { payId: "", note: "" },
  crypto: { walletAddress: "", network: "" },
};

export function defaultStoreSettingsConfig(): StoreSettingsConfig {
  const carriers = Object.fromEntries(
    SHIPPING_CARRIER_KEYS.map((key) => [key, false]),
  ) as Record<ShippingCarrierKey, boolean>;

  const methods = Object.fromEntries(
    PAYMENT_METHOD_KEYS.map((key) => [
      key,
      { enabled: false, fields: { ...DEFAULT_PAYMENT_FIELDS[key] } },
    ]),
  ) as StoreSettingsConfig["payments"]["methods"];

  return {
    shipping: {
      carriers,
      deliveryDetails: "",
    },
    payments: {
      methods,
      installments: {
        enabled: false,
        minUsd: "25",
        maxInstallments: "3",
        conditions: "",
      },
    },
    promotions: [],
    contact: {
      whatsappPhone: "",
    },
    locationHours: {
      address: "",
      city: "",
      schedule: defaultWeekdaySchedule(),
      openTime: "09:00",
      closeTime: "18:00",
    },
    catalogDesign: {
      primaryColor: getDefaultPrimaryColorForRubro("general"),
      layout: "grid",
    },
    catalogCurrency: {
      showOfficialRate: true,
      showBsConversion: true,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeStoreSettingsConfig(raw: unknown): StoreSettingsConfig {
  const defaults = defaultStoreSettingsConfig();

  if (!isRecord(raw)) {
    return defaults;
  }

  const shippingRaw = isRecord(raw.shipping) ? raw.shipping : {};
  const carriersRaw = isRecord(shippingRaw.carriers) ? shippingRaw.carriers : {};

  const carriers = { ...defaults.shipping.carriers };
  for (const key of SHIPPING_CARRIER_KEYS) {
    if (typeof carriersRaw[key] === "boolean") {
      carriers[key] = carriersRaw[key];
    }
  }

  const paymentsRaw = isRecord(raw.payments) ? raw.payments : {};
  const methodsRaw = isRecord(paymentsRaw.methods) ? paymentsRaw.methods : {};
  const installmentsRaw = isRecord(paymentsRaw.installments)
    ? paymentsRaw.installments
    : {};

  const methods = { ...defaults.payments.methods };
  for (const key of PAYMENT_METHOD_KEYS) {
    const methodRaw = methodsRaw[key];
    if (!isRecord(methodRaw)) continue;

    const fieldsRaw = isRecord(methodRaw.fields) ? methodRaw.fields : {};
    const fields = { ...defaults.payments.methods[key].fields };
    for (const [fieldKey, fieldValue] of Object.entries(fieldsRaw)) {
      if (typeof fieldValue === "string") {
        fields[fieldKey] = fieldValue;
      }
    }

    methods[key] = {
      enabled:
        typeof methodRaw.enabled === "boolean"
          ? methodRaw.enabled
          : defaults.payments.methods[key].enabled,
      fields,
    };
  }

  const promotionsRaw = Array.isArray(raw.promotions) ? raw.promotions : [];
  const promotions = promotionsRaw
    .filter(isRecord)
    .map((promo) => ({
      id: typeof promo.id === "string" ? promo.id : crypto.randomUUID(),
      targetType:
        promo.targetType === "category" ? ("category" as const) : ("product" as const),
      targetId: typeof promo.targetId === "string" ? promo.targetId : "",
      targetName: typeof promo.targetName === "string" ? promo.targetName : "",
      discountType:
        promo.discountType === "fixed" ? ("fixed" as const) : ("percent" as const),
      discountValue:
        typeof promo.discountValue === "number" && Number.isFinite(promo.discountValue)
          ? promo.discountValue
          : 0,
      validUntil: typeof promo.validUntil === "string" ? promo.validUntil : "",
      active: typeof promo.active === "boolean" ? promo.active : true,
    }))
    .filter(
      (promo) =>
        promo.targetId &&
        promo.targetName &&
        promo.discountValue > 0 &&
        promo.validUntil,
    );

  const contactRaw = isRecord(raw.contact) ? raw.contact : {};
  const locationRaw = isRecord(raw.locationHours) ? raw.locationHours : {};
  const scheduleRaw = isRecord(locationRaw.schedule) ? locationRaw.schedule : {};
  const schedule = { ...defaults.locationHours.schedule };
  const designRaw = isRecord(raw.catalogDesign) ? raw.catalogDesign : {};
  const currencyRaw = isRecord(raw.catalogCurrency) ? raw.catalogCurrency : {};

  for (const key of WEEKDAY_KEYS) {
    const dayRaw = scheduleRaw[key];
    if (isRecord(dayRaw) && typeof dayRaw.enabled === "boolean") {
      schedule[key] = { enabled: dayRaw.enabled };
    }
  }

  return {
    shipping: {
      carriers,
      deliveryDetails:
        typeof shippingRaw.deliveryDetails === "string"
          ? shippingRaw.deliveryDetails
          : defaults.shipping.deliveryDetails,
    },
    payments: {
      methods,
      installments: {
        enabled:
          typeof installmentsRaw.enabled === "boolean"
            ? installmentsRaw.enabled
            : defaults.payments.installments.enabled,
        minUsd:
          typeof installmentsRaw.minUsd === "string"
            ? installmentsRaw.minUsd
            : defaults.payments.installments.minUsd,
        maxInstallments:
          typeof installmentsRaw.maxInstallments === "string"
            ? installmentsRaw.maxInstallments
            : defaults.payments.installments.maxInstallments,
        conditions:
          typeof installmentsRaw.conditions === "string"
            ? installmentsRaw.conditions
            : defaults.payments.installments.conditions,
      },
    },
    promotions,
    contact: {
      whatsappPhone:
        typeof contactRaw.whatsappPhone === "string"
          ? contactRaw.whatsappPhone
          : defaults.contact.whatsappPhone,
    },
    locationHours: {
      address:
        typeof locationRaw.address === "string"
          ? locationRaw.address
          : defaults.locationHours.address,
      city:
        typeof locationRaw.city === "string"
          ? locationRaw.city
          : defaults.locationHours.city,
      schedule,
      openTime:
        typeof locationRaw.openTime === "string"
          ? locationRaw.openTime
          : defaults.locationHours.openTime,
      closeTime:
        typeof locationRaw.closeTime === "string"
          ? locationRaw.closeTime
          : defaults.locationHours.closeTime,
    },
    catalogDesign: {
      primaryColor:
        typeof designRaw.primaryColor === "string"
          ? designRaw.primaryColor
          : defaults.catalogDesign.primaryColor,
      layout:
        designRaw.layout === "list" || designRaw.layout === "grid"
          ? designRaw.layout
          : defaults.catalogDesign.layout,
    },
    catalogCurrency: {
      showOfficialRate:
        typeof currencyRaw.showOfficialRate === "boolean"
          ? currencyRaw.showOfficialRate
          : defaults.catalogCurrency.showOfficialRate,
      showBsConversion:
        typeof currencyRaw.showBsConversion === "boolean"
          ? currencyRaw.showBsConversion
          : defaults.catalogCurrency.showBsConversion,
    },
  };
}

export function mergeStoreSettingsConfig(
  base: StoreSettingsConfig,
  patch: Partial<StoreSettingsConfig>,
): StoreSettingsConfig {
  return {
    shipping: patch.shipping
      ? {
          ...base.shipping,
          ...patch.shipping,
          carriers: {
            ...base.shipping.carriers,
            ...patch.shipping.carriers,
          },
        }
      : base.shipping,
    payments: patch.payments
      ? {
          ...base.payments,
          ...patch.payments,
          methods: patch.payments.methods
            ? (Object.fromEntries(
                PAYMENT_METHOD_KEYS.map((key) => [
                  key,
                  {
                    ...base.payments.methods[key],
                    ...patch.payments!.methods![key],
                    fields: {
                      ...base.payments.methods[key].fields,
                      ...patch.payments!.methods![key]?.fields,
                    },
                  },
                ]),
              ) as StoreSettingsConfig["payments"]["methods"])
            : base.payments.methods,
          installments: patch.payments.installments
            ? {
                ...base.payments.installments,
                ...patch.payments.installments,
              }
            : base.payments.installments,
        }
      : base.payments,
    promotions: patch.promotions ?? base.promotions,
    contact: patch.contact ? { ...base.contact, ...patch.contact } : base.contact,
    locationHours: patch.locationHours
      ? {
          ...base.locationHours,
          ...patch.locationHours,
          schedule: patch.locationHours.schedule
            ? { ...base.locationHours.schedule, ...patch.locationHours.schedule }
            : base.locationHours.schedule,
        }
      : base.locationHours,
    catalogDesign: patch.catalogDesign
      ? { ...base.catalogDesign, ...patch.catalogDesign }
      : base.catalogDesign,
    catalogCurrency: patch.catalogCurrency
      ? { ...base.catalogCurrency, ...patch.catalogCurrency }
      : base.catalogCurrency,
  };
}
