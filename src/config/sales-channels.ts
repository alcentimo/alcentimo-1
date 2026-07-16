import type { ChannelProviderKey } from "@/src/config/channel-integrations";

export type SalesChannelKey =
  | "whatsapp"
  | "tienda_fisica"
  | "otro";

export interface SalesChannelDefinition {
  key: SalesChannelKey;
  label: string;
  description: string;
  /** Valor persistido en ventas.canal_venta */
  dbValue: string;
  logoProvider?: ChannelProviderKey;
}

export const SALES_CHANNELS: SalesChannelDefinition[] = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    description: "Pedidos por WhatsApp",
    dbValue: "WhatsApp",
    logoProvider: "whatsapp",
  },
  {
    key: "tienda_fisica",
    label: "Tienda física",
    description: "Venta presencial en tu local",
    dbValue: "Tienda Fisica",
  },
  {
    key: "otro",
    label: "Otro",
    description: "Otro canal no listado",
    dbValue: "Otro",
  },
];

export const SALES_CHANNEL_BY_KEY = Object.fromEntries(
  SALES_CHANNELS.map((channel) => [channel.key, channel]),
) as Record<SalesChannelKey, SalesChannelDefinition>;

export const SALES_CHANNEL_DB_VALUES = new Set(
  SALES_CHANNELS.map((channel) => channel.dbValue),
);

export function getSalesChannel(key: SalesChannelKey): SalesChannelDefinition {
  return SALES_CHANNEL_BY_KEY[key];
}

export function isValidSalesChannelDbValue(value: string): boolean {
  return SALES_CHANNEL_DB_VALUES.has(value);
}
