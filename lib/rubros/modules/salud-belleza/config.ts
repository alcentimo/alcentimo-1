/** Presets ligeros del módulo Salud, Belleza y Cuidado Personal. */

export const SALUD_BELLEZA_MODULE_ID = "salud-belleza" as const;

export const BEAUTY_ATTR_PRESENTACION = "presentacion";
export const BEAUTY_ATTR_TONO = "tono";

export type BeautyVariantMode = "presentacion" | "tono";

/** Presentaciones / volúmenes (ml / g). */
export const BEAUTY_VOLUME_PRESETS = [
  "15 ml",
  "30 ml",
  "50 ml",
  "100 ml",
  "250 ml",
  "50 g",
  "100 g",
  "200 g",
] as const;

/** Tonos de color (maquillaje / cabello / etc.). */
export const BEAUTY_TONE_PRESETS = [
  "Nude",
  "Rosa",
  "Coral",
  "Rojo",
  "Beige",
  "Bronce",
  "Caramelo",
  "Negro",
] as const;

export const BEAUTY_FIELD_SKIN = "Tipo de piel";
export const BEAUTY_FIELD_INGREDIENTS = "Ingredientes clave";

export const BEAUTY_FIELD_LABELS = [
  BEAUTY_FIELD_SKIN,
  BEAUTY_FIELD_INGREDIENTS,
] as const;

export const BEAUTY_SKIN_TYPE_OPTIONS = [
  "Normal",
  "Seca",
  "Grasa",
  "Mixta",
  "Sensible",
] as const;

export function getBeautyFieldLabels(): string[] {
  return [...BEAUTY_FIELD_LABELS];
}
