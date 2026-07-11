export type ChannelProviderKey = "whatsapp" | "instagram" | "messenger";

export interface ChannelIntegrationDefinition {
  key: ChannelProviderKey;
  label: string;
  headline: string;
  description: string;
  accentClass: string;
  badgeClass: string;
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
