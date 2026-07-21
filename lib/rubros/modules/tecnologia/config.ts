/** Presets ligeros del módulo Tecnología y Electrónica (sin componentes React). */

export const TECNOLOGIA_MODULE_ID = "tecnologia" as const;

/** Specs base pedidas para el estándar de gadgets. */
export const TECH_CORE_SPEC_LABELS = [
  "Almacenamiento",
  "Memoria RAM",
  "Color",
  "Compatibilidad",
] as const;

export const TECH_SPEC_PRESETS: Record<string, readonly string[]> = {
  Almacenamiento: ["64 GB", "128 GB", "256 GB", "512 GB", "1 TB"],
  "Memoria RAM": ["4 GB", "6 GB", "8 GB", "12 GB", "16 GB", "32 GB"],
  Color: ["Negro", "Blanco", "Plata", "Azul", "Grafito", "Dorado"],
  Compatibilidad: [
    "USB-C",
    "Lightning",
    "Android",
    "iOS",
    "Windows",
    "Universal",
  ],
  Pantalla: ['13"', '14"', '15.6"', '6.1"', '6.7"', '10.9"'],
};

/** Specs por categoría de menú tecnológico. */
export const TECH_SPECS_BY_CATEGORY: Record<string, readonly string[]> = {
  celulares: ["Almacenamiento", "Memoria RAM", "Color", "Compatibilidad"],
  laptops: ["Almacenamiento", "Memoria RAM", "Pantalla", "Color"],
  tablets: ["Almacenamiento", "Memoria RAM", "Color", "Compatibilidad"],
  audio: ["Compatibilidad", "Color"],
  accesorios: ["Compatibilidad", "Color"],
  repuestos: ["Compatibilidad", "Modelo compatible", "Marca"],
};

export function getTechSpecLabels(categorySlug: string | null | undefined): string[] {
  if (!categorySlug) return [...TECH_CORE_SPEC_LABELS];
  return [...(TECH_SPECS_BY_CATEGORY[categorySlug] ?? TECH_CORE_SPEC_LABELS)];
}
