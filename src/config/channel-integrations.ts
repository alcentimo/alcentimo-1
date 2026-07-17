/** Identificadores de canal usados en UI (ventas, inbox, logos). */
export type ChannelProviderKey = "whatsapp";

export function getChannelProviderLabel(key: ChannelProviderKey): string {
  if (key === "whatsapp") return "WhatsApp";
  return key;
}
