/** Presets ligeros del módulo Papelería, Librería y Oficina. */

export const PAPELERIA_LIBRERIA_OFICINA_MODULE_ID =
  "papeleria-libreria-oficina" as const;

export const STATIONERY_FIELD_BRAND = "Marca";
export const STATIONERY_FIELD_PRESENTATION = "Presentación";
export const STATIONERY_FIELD_SEGMENT = "Segmento";
export const STATIONERY_FIELD_FORMAT = "Formato / Tamaño";
export const STATIONERY_FIELD_COLOR = "Color";
export const STATIONERY_FIELD_MODEL = "Modelo / Referencia";
export const STATIONERY_FIELD_GRAMMAGE = "Gramaje";
export const STATIONERY_FIELD_SHEET_TYPE = "Tipo de hoja";

export const STATIONERY_FIELD_LABELS = [
  STATIONERY_FIELD_BRAND,
  STATIONERY_FIELD_PRESENTATION,
  STATIONERY_FIELD_SEGMENT,
  STATIONERY_FIELD_FORMAT,
  STATIONERY_FIELD_COLOR,
  STATIONERY_FIELD_MODEL,
  STATIONERY_FIELD_GRAMMAGE,
  STATIONERY_FIELD_SHEET_TYPE,
] as const;

export const STATIONERY_PRESENTATION_OPTIONS = [
  "Unidad",
  "Paquete",
  "Resma",
  "Caja",
] as const;

export const STATIONERY_SEGMENT_OPTIONS = [
  "Escolar",
  "Oficina",
  "Arte",
] as const;

export const STATIONERY_FORMAT_OPTIONS = [
  "A4",
  "Carta",
  "Oficio",
  "A5",
  "Mini",
  "Otro",
] as const;

export const STATIONERY_COLOR_OPTIONS = [
  "Negro",
  "Azul",
  "Rojo",
  "Verde",
  "Multicolor",
  "Sin especificar",
] as const;

export const STATIONERY_GRAMMAGE_OPTIONS = [
  "56 g",
  "75 g",
  "90 g",
  "120 g",
  "180 g",
] as const;

export const STATIONERY_SHEET_TYPE_OPTIONS = [
  "Rayada",
  "Cuadriculada",
  "Lisa",
  "Punteada",
  "Mixta",
] as const;

/** Campos destacados por categoría de menú de papelería. */
export const STATIONERY_FIELDS_BY_CATEGORY: Record<string, readonly string[]> = {
  cuadernos: [
    STATIONERY_FIELD_BRAND,
    STATIONERY_FIELD_PRESENTATION,
    STATIONERY_FIELD_FORMAT,
    STATIONERY_FIELD_GRAMMAGE,
    STATIONERY_FIELD_SHEET_TYPE,
    STATIONERY_FIELD_SEGMENT,
  ],
  "utiles-escolares": [
    STATIONERY_FIELD_BRAND,
    STATIONERY_FIELD_PRESENTATION,
    STATIONERY_FIELD_SEGMENT,
    STATIONERY_FIELD_COLOR,
    STATIONERY_FIELD_MODEL,
  ],
  papeleria: [
    STATIONERY_FIELD_BRAND,
    STATIONERY_FIELD_PRESENTATION,
    STATIONERY_FIELD_FORMAT,
    STATIONERY_FIELD_COLOR,
    STATIONERY_FIELD_SEGMENT,
  ],
  "material-oficina": [
    STATIONERY_FIELD_BRAND,
    STATIONERY_FIELD_PRESENTATION,
    STATIONERY_FIELD_SEGMENT,
    STATIONERY_FIELD_MODEL,
    STATIONERY_FIELD_COLOR,
  ],
  impresion: [
    STATIONERY_FIELD_BRAND,
    STATIONERY_FIELD_PRESENTATION,
    STATIONERY_FIELD_FORMAT,
    STATIONERY_FIELD_GRAMMAGE,
    STATIONERY_FIELD_SHEET_TYPE,
  ],
  libros: [
    STATIONERY_FIELD_BRAND,
    STATIONERY_FIELD_PRESENTATION,
    STATIONERY_FIELD_FORMAT,
    STATIONERY_FIELD_SEGMENT,
  ],
};

export function getStationeryFieldLabels(
  categorySlug: string | null | undefined,
): string[] {
  if (!categorySlug) return [...STATIONERY_FIELD_LABELS];
  return [
    ...(STATIONERY_FIELDS_BY_CATEGORY[categorySlug] ?? STATIONERY_FIELD_LABELS),
  ];
}
