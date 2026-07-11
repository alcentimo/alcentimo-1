export type MetaProviderKey = "whatsapp" | "instagram" | "messenger";

export type ChannelProviderKey = MetaProviderKey | "mercadolibre";

export type ChannelCategory = "messaging" | "marketplace";

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
  {
    key: "instagram",
    label: "Instagram",
    headline: "Convierte DMs de Instagram en conversaciones",
    description:
      "Centraliza los mensajes directos de tu cuenta profesional de Instagram.",
    accentClass:
      "from-fuchsia-50 to-rose-50 dark:from-fuchsia-950/30 dark:to-rose-950/30",
    badgeClass: "bg-linear-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white",
    category: "messaging",
    connectPath: "/api/integrations/meta/connect?provider=instagram",
    destinationHref: "/dashboard/mensajes",
  },
  {
    key: "messenger",
    label: "Facebook / Messenger",
    headline: "Responde Messenger desde tu panel",
    description:
      "Conecta la página de Facebook de tu negocio para recibir mensajes de Messenger.",
    accentClass:
      "from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30",
    badgeClass: "bg-[#1877F2] text-white",
    category: "messaging",
    connectPath: "/api/integrations/meta/connect?provider=messenger",
    destinationHref: "/dashboard/mensajes",
  },
  {
    key: "mercadolibre",
    label: "MercadoLibre",
    headline: "Centraliza preguntas y ventas de tu publicación",
    description:
      "Conecta tu cuenta de vendedor para recibir preguntas de compradores y alertas de nuevas ventas en tu bandeja.",
    accentClass:
      "from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20",
    badgeClass: "bg-[#FFE600] text-zinc-900",
    category: "marketplace",
    connectPath: "/api/auth/mercadolibre/connect",
    connectLabel: "Conectar cuenta",
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
  return key !== "mercadolibre";
}
