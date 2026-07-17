export type ShippingCarrierKey =
  | "mrw"
  | "tealca"
  | "zoom"
  | "domesa"
  | "libertyExpress"
  | "delivery"
  | "pickup";

export interface ShippingSettings {
  carriers: Record<ShippingCarrierKey, boolean>;
  deliveryDetails: string;
}

export type PaymentMethodKey =
  | "pagoMovil"
  | "zelle"
  | "cashea"
  | "transferencia"
  | "efectivoUsd"
  | "puntoVenta"
  | "crypto"
  | "paypal"
  | "binance";

export interface PaymentMethodConfig {
  enabled: boolean;
  fields: Record<string, string>;
}

export interface InstallmentsSettings {
  enabled: boolean;
  minUsd: string;
  maxInstallments: string;
  conditions: string;
}

export interface PaymentsSettings {
  methods: Record<PaymentMethodKey, PaymentMethodConfig>;
  installments: InstallmentsSettings;
}

export interface StoredPromotion {
  id: string;
  targetType: "product" | "category";
  targetId: string;
  targetName: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  validUntil: string;
  active: boolean;
}

export interface StoreSettingsConfig {
  shipping: ShippingSettings;
  payments: PaymentsSettings;
  promotions: StoredPromotion[];
  contact: ContactSettings;
  locationHours: LocationHoursSettings;
  catalogDesign: CatalogDesignSettings;
  catalogCurrency: CatalogCurrencySettings;
}

export interface ContactSettings {
  whatsappPhone: string;
}

export const WEEKDAY_KEYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export interface DaySchedule {
  enabled: boolean;
}

export interface LocationHoursSettings {
  address: string;
  city: string;
  schedule: Record<WeekdayKey, DaySchedule>;
  openTime: string;
  closeTime: string;
}

export type CatalogLayoutMode = "grid" | "list";

export interface CatalogDesignSettings {
  primaryColor: string;
  layout: CatalogLayoutMode;
}

export interface CatalogCurrencySettings {
  /** Muestra la tasa BCV oficial en el catálogo público. */
  showOfficialRate: boolean;
  /** Muestra precios convertidos a Bs en catálogo, carrito y checkout. */
  showBsConversion: boolean;
}

export interface StoreSettingsRow {
  id: string;
  store_id: string;
  config: StoreSettingsConfig;
  created_at: string;
  updated_at: string;
}
