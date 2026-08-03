/** Mensaje de bienvenida por defecto del chat rápido de WhatsApp. */
export const DEFAULT_WHATSAPP_CHAT_WELCOME =
  "¡Hola! ¿Tienes alguna duda sobre nuestros productos?";

export const WHATSAPP_CHAT_WELCOME_MAX_LENGTH = 280;

export function normalizeWhatsAppChatWelcome(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_WHATSAPP_CHAT_WELCOME;
  const trimmed = value.trim().slice(0, WHATSAPP_CHAT_WELCOME_MAX_LENGTH);
  return trimmed.length > 0 ? trimmed : DEFAULT_WHATSAPP_CHAT_WELCOME;
}

/** Texto prellenado al abrir WhatsApp desde el chat rápido del catálogo. */
export function buildWhatsAppQuickChatMessage(
  storeName: string,
  userMessage: string,
): string {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return `Hola, escribo desde el catálogo de ${storeName}.`;
  }
  return `Hola, escribo desde el catálogo de ${storeName}:\n\n${trimmed}`;
}
