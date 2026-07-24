/**
 * Módulo de producto: Papelería, Librería y Oficina.
 * Se importa solo cuando `getActiveProductModuleId(rubro) === "papeleria-libreria-oficina"`.
 */
export {
  PAPELERIA_LIBRERIA_OFICINA_MODULE_ID,
  STATIONERY_FIELD_BRAND,
  STATIONERY_FIELD_PRESENTATION,
  STATIONERY_FIELD_SEGMENT,
  STATIONERY_FIELD_FORMAT,
  STATIONERY_FIELD_COLOR,
  STATIONERY_FIELD_MODEL,
  STATIONERY_FIELD_GRAMMAGE,
  STATIONERY_FIELD_SHEET_TYPE,
  STATIONERY_FIELD_UNITS_PER_PACK,
  STATIONERY_FIELD_LABELS,
  STATIONERY_PRESENTATION_OPTIONS,
  STATIONERY_SEGMENT_OPTIONS,
  STATIONERY_FORMAT_OPTIONS,
  STATIONERY_COLOR_OPTIONS,
  STATIONERY_GRAMMAGE_OPTIONS,
  STATIONERY_SHEET_TYPE_OPTIONS,
  STATIONERY_FIELDS_BY_CATEGORY,
  STATIONERY_METADATA_KEY,
  isStationeryMultiPackPresentation,
  parseStationeryUnitsPerPack,
  getStationeryPackVariantLabel,
  getStationeryFieldLabelsForEditor,
  getStationeryUnitsPerPackFromFields,
  buildStationeryMetadataPatch,
  parseStationeryMetadata,
  getStationeryFieldLabels,
} from "@/lib/rubros/modules/papeleria-libreria-oficina/config";

export {
  isStationerySaleVariant,
  areStationerySaleVariants,
  shouldUseStationerySaleVariants,
  syncStationerySaleVariants,
  resolveStationeryUnitsPerSale,
  resolveStationeryVariantAvailableStock,
  resolveStationeryOrderStockUnits,
  formatStationeryStockSummary,
} from "@/lib/rubros/modules/papeleria-libreria-oficina/variants";

export {
  pickStationeryValues,
  getStationeryBadgesFromMetadata,
  type StationeryBadge,
} from "@/lib/rubros/modules/papeleria-libreria-oficina/attributes";
