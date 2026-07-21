/**
 * Módulo de producto: Coleccionables, Cómics y Figuras.
 * Se importa solo cuando `getActiveProductModuleId(rubro) === "coleccionables"`.
 */
export {
  COLECCIONABLES_MODULE_ID,
  COLLECTIBLE_FIELD_CONDITION,
  COLLECTIBLE_FIELD_EDITION,
  COLLECTIBLE_FIELD_PREORDER,
  COLLECTIBLE_FIELD_ETA,
  COLLECTIBLE_FIELD_LABELS,
  COLLECTIBLE_CONDITION_OPTIONS,
  COLLECTIBLE_EDITION_OPTIONS,
  COLLECTIBLE_PREORDER_YES,
  COLLECTIBLE_PREORDER_NO,
  getCollectibleFieldLabels,
  isCollectiblePreorder,
} from "@/lib/rubros/modules/coleccionables/config";

export {
  pickCollectibleValues,
  getCollectibleBadgesFromMetadata,
  type CollectibleBadge,
} from "@/lib/rubros/modules/coleccionables/attributes";
