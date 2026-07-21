/**
 * Módulo Salud, Belleza y Cuidado Personal.
 * Se importa solo cuando `getActiveProductModuleId(rubro) === "salud-belleza"`.
 */

export {
  SALUD_BELLEZA_MODULE_ID,
  BEAUTY_ATTR_PRESENTACION,
  BEAUTY_ATTR_TONO,
  BEAUTY_VOLUME_PRESETS,
  BEAUTY_TONE_PRESETS,
  BEAUTY_FIELD_SKIN,
  BEAUTY_FIELD_INGREDIENTS,
  BEAUTY_FIELD_LABELS,
  BEAUTY_SKIN_TYPE_OPTIONS,
  getBeautyFieldLabels,
  type BeautyVariantMode,
} from "@/lib/rubros/modules/salud-belleza/config";

export {
  beautyOptionKey,
  getBeautyVariantLabel,
  detectBeautyVariantMode,
  emptyBeautyVariants,
  createDefaultBeautyVariants,
  variantsToBeautyState,
  beautyStateToVariants,
  type BeautyVariantsState,
} from "@/lib/rubros/modules/salud-belleza/variants";

export {
  pickBeautyValues,
  getBeautyBadgesFromMetadata,
  type BeautyBadge,
} from "@/lib/rubros/modules/salud-belleza/attributes";
