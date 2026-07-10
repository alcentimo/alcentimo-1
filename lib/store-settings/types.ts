export type ShippingCarrierKey =
  | "mrw"
  | "tealca"
  | "zoom"
  | "domesa"
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
  | "puntoVenta";

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
}

export interface ContactSettings {
  whatsappPhone: string;
}

export interface StoreSettingsRow {
  id: string;
  store_id: string;
  config: StoreSettingsConfig;
  created_at: string;
  updated_at: string;
}
