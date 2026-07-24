export type ShippingCarrierKey =
  | "mrw"
  | "tealca"
  | "zoom"
  | "domesa"
  | "libertyExpress"
  | "delivery"
  | "pickup";

export interface DeliveryMeetingPoint {
  id: string;
  label: string;
  reference?: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  meetingPoints: DeliveryMeetingPoint[];
}

export interface ShippingSettings {
  carriers: Record<ShippingCarrierKey, boolean>;
  deliveryDetails: string;
  /** Zonas con puntos de encuentro para entregas personales. */
  deliveryZones: DeliveryZone[];
  /** Puntos de encuentro para retiro sin tienda física. */
  pickupPoints: DeliveryMeetingPoint[];
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

/** Preferencias de interfaz del panel (tema e idioma). */
export type InterfaceThemePreference = "light" | "dark" | "system";
export type InterfaceLocalePreference = "es" | "en";

export interface InterfacePreferencesSettings {
  theme: InterfaceThemePreference;
  locale: InterfaceLocalePreference;
}

export interface StoreSettingsConfig {
  shipping: ShippingSettings;
  payments: PaymentsSettings;
  promotions: StoredPromotion[];
  contact: ContactSettings;
  locationHours: LocationHoursSettings;
  catalogDesign: CatalogDesignSettings;
  catalogCurrency: CatalogCurrencySettings;
  messageTemplates: MessageTemplatesSettings;
  interfacePreferences: InterfacePreferencesSettings;
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

export type CatalogThemeId =
  | "minimal"
  | "impact"
  | "classic"
  | "fashion-pure"
  | "fashion-nocturne"
  | "fashion-editorial";

export type CatalogSaleMode = "quick" | "showcase";

export interface CatalogVisibilitySettings {
  showStock: boolean;
  showDescription: boolean;
  showPrices: boolean;
}

export interface CatalogDesignSettings {
  theme: CatalogThemeId;
  saleMode: CatalogSaleMode;
  visibility: CatalogVisibilitySettings;
  /** Derivado del tema al renderizar; opcional en almacenamiento legacy. */
  primaryColor?: string;
  /** Derivado del tema al renderizar; opcional en almacenamiento legacy. */
  layout?: CatalogLayoutMode;
}

export interface CatalogCurrencySettings {
  /** Muestra la tasa BCV oficial en el catálogo público. */
  showOfficialRate: boolean;
  /** Muestra precios convertidos a Bs en catálogo, carrito y checkout. */
  showBsConversion: boolean;
  /** Activa precios mayoristas por producto en catálogo, carrito y checkout. */
  wholesaleEnabled: boolean;
}

export type OrderMessageTemplateKey = "nuevo" | "confirmado" | "enviado";

export interface MessageTemplatesSettings {
  nuevo: string;
  confirmado: string;
  enviado: string;
}

export interface StoreSettingsRow {
  id: string;
  store_id: string;
  config: StoreSettingsConfig;
  created_at: string;
  updated_at: string;
}
