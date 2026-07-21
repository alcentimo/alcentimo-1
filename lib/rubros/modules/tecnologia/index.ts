/**
 * Módulo de producto: Tecnología y Electrónica.
 * Se importa solo cuando `getActiveProductModuleId(rubro) === "tecnologia"`.
 */
export {
  TECNOLOGIA_MODULE_ID,
  TECH_CORE_SPEC_LABELS,
  TECH_SPEC_PRESETS,
  TECH_SPECS_BY_CATEGORY,
  getTechSpecLabels,
} from "@/lib/rubros/modules/tecnologia/config";

export {
  getTechSpecChipsFromMetadata,
  pickTechSpecValues,
  type TechSpecChip,
} from "@/lib/rubros/modules/tecnologia/specs";
