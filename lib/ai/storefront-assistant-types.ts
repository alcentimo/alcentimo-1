export type StorefrontAssistantRole = "user" | "assistant";

export interface StorefrontAssistantMessage {
  role: StorefrontAssistantRole;
  content: string;
}

export interface StorefrontAssistantRequest {
  messages: StorefrontAssistantMessage[];
  /** Sucursal seleccionada por el comprador (stock contextual). */
  locationId?: string | null;
}

export interface StorefrontAssistantResponse {
  reply: string;
}

export interface StorefrontAssistantProductVariant {
  name: string;
  stock: number;
  attributes?: Record<string, string>;
  locationStock?: Array<{ location: string; stock: number }>;
}

export interface StorefrontAssistantProduct {
  name: string;
  category: string;
  priceUsd: number | null;
  availableStock: number;
  shortDescription: string | null;
  variants: StorefrontAssistantProductVariant[];
}

export interface StorefrontAssistantLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  isDefault: boolean;
}

export interface StorefrontAssistantShippingOption {
  label: string;
  description: string;
  estimatedTime?: string;
  details?: string;
}

export interface StorefrontAssistantContext {
  storeName: string;
  storeRubro: string | null;
  openStatus: string;
  locationHoursSummary: string;
  whatsappAvailable: boolean;
  locations: StorefrontAssistantLocation[];
  shippingOptions: StorefrontAssistantShippingOption[];
  paymentMethods: string[];
  products: StorefrontAssistantProduct[];
  selectedLocationName: string | null;
}
