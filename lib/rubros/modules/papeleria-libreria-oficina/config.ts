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
export const STATIONERY_FIELD_UNITS_PER_PACK = "Unidades por empaque";

export const STATIONERY_VARIANT_ATTR_SALE_MODE = "sale_mode";
export const STATIONERY_VARIANT_ATTR_UNITS_PER_SALE = "units_per_sale";
export const STATIONERY_SALE_MODE_PACK = "pack";
export const STATIONERY_SALE_MODE_UNIT = "unit";

export const STATIONERY_METADATA_KEY = "stationery";

export interface StationeryProductMetadata {
  unified_stock: boolean;
  units_per_pack: number;
}

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

export const STATIONERY_MULTI_PACK_PRESENTATIONS = [
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

export function isStationeryMultiPackPresentation(
  presentation: string | null | undefined,
): boolean {
  const normalized = (presentation ?? "").trim();
  return (STATIONERY_MULTI_PACK_PRESENTATIONS as readonly string[]).includes(
    normalized,
  );
}

export function parseStationeryUnitsPerPack(
  value: string | null | undefined,
): number | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed < 2) return null;
  return parsed;
}

export function getStationeryPackVariantLabel(
  presentation: string | null | undefined,
): string {
  const normalized = (presentation ?? "").trim();
  if (!normalized || normalized === "Unidad") return "Por empaque";
  return `Por ${normalized.toLowerCase()}`;
}

export function getStationeryFieldLabels(
  categorySlug: string | null | undefined,
): string[] {
  if (!categorySlug) return [...STATIONERY_FIELD_LABELS];
  return [
    ...(STATIONERY_FIELDS_BY_CATEGORY[categorySlug] ?? STATIONERY_FIELD_LABELS),
  ];
}

export function getStationeryFieldLabelsForEditor(
  categorySlug: string | null | undefined,
  presentation: string | null | undefined,
): string[] {
  const labels = getStationeryFieldLabels(categorySlug);
  if (!isStationeryMultiPackPresentation(presentation)) {
    return labels;
  }
  if (labels.includes(STATIONERY_FIELD_UNITS_PER_PACK)) {
    return labels;
  }
  const presentationIndex = labels.indexOf(STATIONERY_FIELD_PRESENTATION);
  if (presentationIndex === -1) {
    return [...labels, STATIONERY_FIELD_UNITS_PER_PACK];
  }
  const next = [...labels];
  next.splice(presentationIndex + 1, 0, STATIONERY_FIELD_UNITS_PER_PACK);
  return next;
}

export function getStationeryUnitsPerPackFromFields(
  fields: Record<string, string | undefined> | null | undefined,
): number | null {
  if (!fields) return null;
  if (!isStationeryMultiPackPresentation(fields[STATIONERY_FIELD_PRESENTATION])) {
    return null;
  }
  return parseStationeryUnitsPerPack(fields[STATIONERY_FIELD_UNITS_PER_PACK]);
}

export function parseStationeryMetadata(
  metadata: Record<string, unknown> | null | undefined,
): StationeryProductMetadata | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = metadata[STATIONERY_METADATA_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  if (row.unified_stock !== true) return null;
  const unitsPerPack = Number(row.units_per_pack);
  if (!Number.isFinite(unitsPerPack) || unitsPerPack < 2) return null;
  return { unified_stock: true, units_per_pack: Math.floor(unitsPerPack) };
}

export function buildStationeryMetadataPatch(
  extraFields: Record<string, string | undefined>,
  hasSaleVariants: boolean,
): Record<string, unknown> | null {
  const unitsPerPack = getStationeryUnitsPerPackFromFields(extraFields);
  if (!hasSaleVariants || !unitsPerPack) return null;
  return {
    [STATIONERY_METADATA_KEY]: {
      unified_stock: true,
      units_per_pack: unitsPerPack,
    } satisfies StationeryProductMetadata,
  };
}
