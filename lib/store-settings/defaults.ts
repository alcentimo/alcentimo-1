import type {
  CatalogDesignSettings,
  DaySchedule,
  PaymentMethodKey,
  ShippingCarrierKey,
  StoreSettingsConfig,
  WeekdayKey,
} from "@/lib/store-settings/types";
import { MAX_WHATSAPP_PHONES, WEEKDAY_KEYS } from "@/lib/store-settings/types";
import { defaultMessageTemplates } from "@/lib/orders/message-templates";
import {
  normalizeDeliveryZones,
  normalizePickupPoints,
} from "@/lib/store-settings/delivery-zones";

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

const DEFAULT_OPEN_TIME = "09:00";
const DEFAULT_CLOSE_TIME = "18:00";

function defaultDaySchedule(enabled: boolean): DaySchedule {
  return {
    enabled,
    openTime: DEFAULT_OPEN_TIME,
    closeTime: DEFAULT_CLOSE_TIME,
  };
}

function defaultWeekdaySchedule(): Record<WeekdayKey, DaySchedule> {
  return Object.fromEntries(
    WEEKDAY_KEYS.map((key) => [key, defaultDaySchedule(key !== "sun")]),
  ) as Record<WeekdayKey, DaySchedule>;
}

function normalizeWhatsAppPhones(raw: unknown, legacyPhone: string): string[] {
  const fromArray = Array.isArray(raw)
    ? raw
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

  if (fromArray.length > 0) {
    return fromArray.slice(0, MAX_WHATSAPP_PHONES);
  }

  const legacy = legacyPhone.trim();
  return legacy ? [legacy] : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeDaySchedule(
  dayRaw: unknown,
  fallbackOpen: string,
  fallbackClose: string,
  defaultEnabled: boolean,
): DaySchedule {
  if (!isRecord(dayRaw)) {
    return {
      enabled: defaultEnabled,
      openTime: fallbackOpen,
      closeTime: fallbackClose,
    };
  }

  return {
    enabled:
      typeof dayRaw.enabled === "boolean" ? dayRaw.enabled : defaultEnabled,
    openTime:
      typeof dayRaw.openTime === "string" && dayRaw.openTime.trim()
        ? dayRaw.openTime.trim()
        : fallbackOpen,
    closeTime:
      typeof dayRaw.closeTime === "string" && dayRaw.closeTime.trim()
        ? dayRaw.closeTime.trim()
        : fallbackClose,
  };
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
      deliveryZones: [],
      pickupPoints: [],
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
      whatsappPhones: [],
    },
    locationHours: {
      address: "",
      city: "",
      schedule: defaultWeekdaySchedule(),
      openTime: DEFAULT_OPEN_TIME,
      closeTime: DEFAULT_CLOSE_TIME,
    },
    catalogDesign: {
      theme: "minimal",
      saleMode: "quick",
      visibility: {
        showStock: true,
        showDescription: true,
        showPrices: true,
      },
    },
    catalogCurrency: {
      showOfficialRate: true,
      showBsConversion: true,
      wholesaleEnabled: false,
    },
    messageTemplates: defaultMessageTemplates(),
    interfacePreferences: {
      theme: "system",
      locale: "es",
    },
  };
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
  const designRaw = isRecord(raw.catalogDesign) ? raw.catalogDesign : {};
  const visibilityRaw = isRecord(designRaw.visibility) ? designRaw.visibility : {};
  const currencyRaw = isRecord(raw.catalogCurrency) ? raw.catalogCurrency : {};
  const templatesRaw = isRecord(raw.messageTemplates) ? raw.messageTemplates : {};
  const interfaceRaw = isRecord(raw.interfacePreferences)
    ? raw.interfacePreferences
    : {};

  const fallbackOpen =
    typeof locationRaw.openTime === "string" && locationRaw.openTime.trim()
      ? locationRaw.openTime.trim()
      : defaults.locationHours.openTime;
  const fallbackClose =
    typeof locationRaw.closeTime === "string" && locationRaw.closeTime.trim()
      ? locationRaw.closeTime.trim()
      : defaults.locationHours.closeTime;

  const schedule = { ...defaults.locationHours.schedule };
  for (const key of WEEKDAY_KEYS) {
    schedule[key] = normalizeDaySchedule(
      scheduleRaw[key],
      fallbackOpen,
      fallbackClose,
      defaults.locationHours.schedule[key].enabled,
    );
  }

  const whatsappPhones = normalizeWhatsAppPhones(
    contactRaw.whatsappPhones,
    typeof contactRaw.whatsappPhone === "string" ? contactRaw.whatsappPhone : "",
  );

  return {
    shipping: {
      carriers,
      deliveryDetails:
        typeof shippingRaw.deliveryDetails === "string"
          ? shippingRaw.deliveryDetails
          : defaults.shipping.deliveryDetails,
      deliveryZones: normalizeDeliveryZones(shippingRaw.deliveryZones),
      pickupPoints: normalizePickupPoints(shippingRaw.pickupPoints),
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
      whatsappPhone: whatsappPhones[0] ?? "",
      whatsappPhones,
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
      openTime: fallbackOpen,
      closeTime: fallbackClose,
    },
    catalogDesign: {
      theme:
        designRaw.theme === "minimal" ||
        designRaw.theme === "impact" ||
        designRaw.theme === "classic" ||
        designRaw.theme === "fashion-pure" ||
        designRaw.theme === "fashion-nocturne" ||
        designRaw.theme === "fashion-editorial"
          ? designRaw.theme
          : designRaw.layout === "list"
            ? "classic"
            : defaults.catalogDesign.theme,
      saleMode:
        designRaw.saleMode === "showcase" || designRaw.saleMode === "quick"
          ? designRaw.saleMode
          : defaults.catalogDesign.saleMode,
      visibility: {
        showStock:
          typeof visibilityRaw.showStock === "boolean"
            ? visibilityRaw.showStock
            : defaults.catalogDesign.visibility.showStock,
        showDescription:
          typeof visibilityRaw.showDescription === "boolean"
            ? visibilityRaw.showDescription
            : defaults.catalogDesign.visibility.showDescription,
        showPrices:
          typeof visibilityRaw.showPrices === "boolean"
            ? visibilityRaw.showPrices
            : defaults.catalogDesign.visibility.showPrices,
      },
      ...(typeof designRaw.primaryColor === "string"
        ? { primaryColor: designRaw.primaryColor }
        : {}),
      ...(designRaw.layout === "list" || designRaw.layout === "grid"
        ? { layout: designRaw.layout }
        : {}),
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
      wholesaleEnabled:
        typeof currencyRaw.wholesaleEnabled === "boolean"
          ? currencyRaw.wholesaleEnabled
          : defaults.catalogCurrency.wholesaleEnabled,
    },
    messageTemplates: {
      nuevo:
        typeof templatesRaw.nuevo === "string" && templatesRaw.nuevo.trim()
          ? templatesRaw.nuevo
          : defaults.messageTemplates.nuevo,
      confirmado:
        typeof templatesRaw.confirmado === "string" && templatesRaw.confirmado.trim()
          ? templatesRaw.confirmado
          : defaults.messageTemplates.confirmado,
      enviado:
        typeof templatesRaw.enviado === "string" && templatesRaw.enviado.trim()
          ? templatesRaw.enviado
          : defaults.messageTemplates.enviado,
    },
    interfacePreferences: {
      theme:
        interfaceRaw.theme === "light" ||
        interfaceRaw.theme === "dark" ||
        interfaceRaw.theme === "system"
          ? interfaceRaw.theme
          : defaults.interfacePreferences.theme,
      locale:
        interfaceRaw.locale === "es" || interfaceRaw.locale === "en"
          ? interfaceRaw.locale
          : defaults.interfacePreferences.locale,
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
          deliveryZones:
            patch.shipping.deliveryZones ?? base.shipping.deliveryZones,
          pickupPoints:
            patch.shipping.pickupPoints ?? base.shipping.pickupPoints,
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
    contact: patch.contact
      ? (() => {
          const phones = normalizeWhatsAppPhones(
            patch.contact.whatsappPhones ?? base.contact.whatsappPhones,
            patch.contact.whatsappPhone ?? base.contact.whatsappPhone,
          );
          return {
            whatsappPhone: phones[0] ?? "",
            whatsappPhones: phones,
          };
        })()
      : base.contact,
    locationHours: patch.locationHours
      ? {
          ...base.locationHours,
          ...patch.locationHours,
          schedule: patch.locationHours.schedule
            ? (Object.fromEntries(
                WEEKDAY_KEYS.map((key) => [
                  key,
                  {
                    ...base.locationHours.schedule[key],
                    ...patch.locationHours!.schedule![key],
                  },
                ]),
              ) as StoreSettingsConfig["locationHours"]["schedule"])
            : base.locationHours.schedule,
        }
      : base.locationHours,
    catalogDesign: patch.catalogDesign
      ? { ...base.catalogDesign, ...patch.catalogDesign }
      : base.catalogDesign,
    catalogCurrency: patch.catalogCurrency
      ? { ...base.catalogCurrency, ...patch.catalogCurrency }
      : base.catalogCurrency,
    messageTemplates: patch.messageTemplates
      ? { ...base.messageTemplates, ...patch.messageTemplates }
      : base.messageTemplates,
    interfacePreferences: patch.interfacePreferences
      ? { ...base.interfacePreferences, ...patch.interfacePreferences }
      : base.interfacePreferences,
  };
}
