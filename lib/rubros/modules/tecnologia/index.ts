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

export {
  PC_BUILDER_SLOTS,
  PC_BUILDER_SLOT_ORDER,
  calculatePCBuilderTotalUsd,
  filterProductsForPCBuilderSlot,
  getPCBuilderSlotDefinition,
  indexProductsByPCBuilderSlot,
  isPCBuilderComplete,
  resolvePCBuilderSlot,
  storeHasPCBuilder,
  type PCBuilderSelection,
  type PCBuilderSlotId,
} from "@/lib/rubros/modules/tecnologia/pc-builder";
