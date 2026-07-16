export type MetaProviderKey = "whatsapp";

export type ChannelProviderKey = MetaProviderKey;

export type ChannelCategory = "messaging";

export interface ChannelIntegrationDefinition {
  key: ChannelProviderKey;
  label: string;
  headline: string;
  description: string;
  accentClass: string;
  badgeClass: string;
  category: ChannelCategory;
  connectPath: string;
  destinationHref: string;
  connectLabel?: string;
}

export const CHANNEL_INTEGRATIONS: ChannelIntegrationDefinition[] = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    headline: "Atiende pedidos y consultas por WhatsApp",
    description:
      "Recibe mensajes de clientes en tu bandeja de Mensajes y responde desde un solo lugar.",
    accentClass:
      "from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30",
    badgeClass: "bg-emerald-600 text-white",
    category: "messaging",
    connectPath: "/api/integrations/meta/connect?provider=whatsapp",
    destinationHref: "/dashboard/mensajes",
  },
];

export function getChannelIntegration(
  key: ChannelProviderKey,
): ChannelIntegrationDefinition {
  const channel = CHANNEL_INTEGRATIONS.find((item) => item.key === key);
  if (!channel) {
    throw new Error(`Unknown channel integration: ${key}`);
  }
  return channel;
}

export function isMetaProvider(key: ChannelProviderKey): key is MetaProviderKey {
  return key === "whatsapp";
}
