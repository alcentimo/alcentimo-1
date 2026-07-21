/** Presets ligeros del módulo Coleccionables, Cómics y Figuras. */

export const COLECCIONABLES_MODULE_ID = "coleccionables" as const;

export const COLLECTIBLE_FIELD_CONDITION = "Condición";
export const COLLECTIBLE_FIELD_EDITION = "Edición / Rareza";
export const COLLECTIBLE_FIELD_PREORDER = "Preventa";
export const COLLECTIBLE_FIELD_ETA = "Llegada estimada";

export const COLLECTIBLE_FIELD_LABELS = [
  COLLECTIBLE_FIELD_CONDITION,
  COLLECTIBLE_FIELD_EDITION,
  COLLECTIBLE_FIELD_PREORDER,
  COLLECTIBLE_FIELD_ETA,
] as const;

export const COLLECTIBLE_CONDITION_OPTIONS = [
  "Nuevo / Sellado de fábrica",
  "Abierto en excelente estado",
  "Usado",
] as const;

export const COLLECTIBLE_EDITION_OPTIONS = [
  "Edición Regular",
  "Edición Limitada / Exclusiva",
  "Chase",
] as const;

export const COLLECTIBLE_PREORDER_YES = "Sí";
export const COLLECTIBLE_PREORDER_NO = "No";

export function getCollectibleFieldLabels(): string[] {
  return [...COLLECTIBLE_FIELD_LABELS];
}

export function isCollectiblePreorder(value: string | null | undefined): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  return (
    normalized === "sí" ||
    normalized === "si" ||
    normalized === "yes" ||
    normalized === "true" ||
    normalized === "1"
  );
}
