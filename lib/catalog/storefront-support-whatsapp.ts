/** Mensaje prellenado cuando el comprador escala a un operador humano por WhatsApp. */
export function buildStorefrontSupportWhatsAppMessage(
  storeName: string,
  userQuestion?: string | null,
): string {
  const trimmed = userQuestion?.trim();
  if (!trimmed) {
    return `Hola, necesito ayuda con una consulta en ${storeName}.`;
  }
  return `Hola, necesito ayuda en ${storeName}.\n\nMi consulta: ${trimmed}`;
}
