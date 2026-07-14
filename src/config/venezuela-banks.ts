/** Principales bancos de Venezuela para Pago Móvil y transferencias. */
export const VENEZUELA_BANKS = [
  "Banesco",
  "Banco de Venezuela",
  "Mercantil",
  "BBVA Provincial",
  "Bancamiga",
  "Banco Nacional de Crédito (BNC)",
  "Banco Exterior",
  "Banco del Tesoro",
  "Banco Plaza",
  "Bancaribe",
  "Banco Activo",
  "Banco Fondo Común (BFC)",
  "Banco Sofitasa",
  "Banco Caroní",
  "Bangente",
  "Mi Banco",
  "Banco Agrícola de Venezuela",
  "100% Banco",
  "Banco Venezolano de Crédito (BVC)",
  "Banco del Caribe",
] as const;

export type VenezuelaBank = (typeof VENEZUELA_BANKS)[number];

const BANK_SET = new Set<string>(VENEZUELA_BANKS);

export function isVenezuelaBank(value: string): value is VenezuelaBank {
  return BANK_SET.has(value);
}

/** Opciones del select; conserva valores legacy guardados fuera de la lista. */
export function getVenezuelaBankOptions(currentValue?: string): string[] {
  const trimmed = currentValue?.trim() ?? "";
  if (trimmed && !BANK_SET.has(trimmed)) {
    return [trimmed, ...VENEZUELA_BANKS];
  }
  return [...VENEZUELA_BANKS];
}
