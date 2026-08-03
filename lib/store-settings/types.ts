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

/**
 * Modo de cuentas de clientes en el catálogo público.
 * Solo queda «hibrido» (invitado + login/registro opcional).
 * El valor «libre» se ignora al leer/guardar por compatibilidad.
 */
export type CustomerAccountMode = "hibrido";

/** @deprecated Solo se aceptaba «libre»; la plataforma fuerza siempre híbrido. */
export type LegacyCustomerAccountMode = "libre" | "hibrido";

export interface CheckoutSettings {
  /**
   * Siempre híbrido: compra como invitado con opción de iniciar sesión o registrarse.
   */
  accountMode: CustomerAccountMode;
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
  checkout: CheckoutSettings;
}

export const MAX_WHATSAPP_PHONES = 3;

export interface ContactSettings {
  /**
   * Número principal (pedidos / wa.me).
   * Se mantiene sincronizado con `whatsappPhones[0]` por compatibilidad.
   */
  whatsappPhone: string;
  /** Hasta 3 números de WhatsApp para recepción de pedidos. */
  whatsappPhones: string[];
  /**
   * Mensaje de bienvenida del chat rápido flotante en el catálogo.
   * Editable por el comercio.
   */
  whatsappChatWelcome?: string;
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
  openTime: string;
  closeTime: string;
}

export interface LocationHoursSettings {
  address: string;
  city: string;
  schedule: Record<WeekdayKey, DaySchedule>;
  /**
   * @deprecated Preferir `schedule[day].openTime`.
   * Se conserva como plantilla / fallback legacy.
   */
  openTime: string;
  /**
   * @deprecated Preferir `schedule[day].closeTime`.
   * Se conserva como plantilla / fallback legacy.
   */
  closeTime: string;
}

export type CatalogLayoutMode = "grid" | "list";

export type CatalogThemeId =
  | "minimal"
  | "impact"
  | "immersive"
  | "fashion-pure"
  | "fashion-nocturne"
  | "fashion-editorial";

export type CatalogSaleMode = "quick" | "showcase";

export interface CatalogVisibilitySettings {
  showStock: boolean;
  showDescription: boolean;
  showPrices: boolean;
}

export interface CatalogPromoBannerSlide {
  id: string;
  mobileImageUrl: string;
  desktopImageUrl?: string;
  alt?: string;
  /** Enlace libre (https://… o ruta relativa /…). */
  linkUrl?: string;
  /** Producto del inventario; al hacer clic abre la ficha en el catálogo. */
  productId?: string;
}

export interface CatalogPromoBannerSettings {
  enabled: boolean;
  slides: CatalogPromoBannerSlide[];
}

/** Modo del avatar del asistente de IA en el catálogo público. */
export type CatalogAssistantAvatarMode = "store-logo" | "preset" | "custom";

export interface CatalogAssistantAvatarSettings {
  mode: CatalogAssistantAvatarMode;
  /** Id de avatar predefinido cuando mode === "preset". */
  presetId?: string;
  /** URL de imagen personalizada cuando mode === "custom". */
  customImageUrl?: string;
}

export interface CatalogFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface CatalogFaqSettings {
  enabled: boolean;
  items: CatalogFaqItem[];
}

export interface CatalogDesignSettings {
  theme: CatalogThemeId;
  saleMode: CatalogSaleMode;
  visibility: CatalogVisibilitySettings;
  /** Color principal de marca elegido por la tienda (hex #rrggbb). */
  primaryColor?: string;
  /** Carrusel promocional opcional en la parte superior del catálogo. */
  promoBanner?: CatalogPromoBannerSettings;
  /** Preguntas frecuentes opcionales al final del catálogo. */
  faq?: CatalogFaqSettings;
  /** Avatar del asistente de IA en el widget flotante y chat del catálogo. */
  assistantAvatar?: CatalogAssistantAvatarSettings;
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
