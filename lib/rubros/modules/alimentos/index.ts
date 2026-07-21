/**
 * Módulo de producto: Alimentos y Bebidas.
 * Se importa solo cuando `getActiveProductModuleId(rubro) === "alimentos"`.
 */
export {
  ALIMENTOS_MODULE_ID,
  ALIMENTOS_PORTION_PRESETS,
  ALIMENTOS_ATTR_PORCION,
  FOOD_MODIFIERS_METADATA_KEY,
} from "@/lib/rubros/modules/alimentos/config";

export {
  getPortionAttribute,
  looksLikeFoodPortionVariants,
  emptyFoodPortions,
  createDefaultFoodPortions,
  portionKey,
  variantsToFoodPortions,
  foodPortionsToVariants,
  type FoodPortionsState,
} from "@/lib/rubros/modules/alimentos/portions";

export {
  emptyFoodModifiers,
  createDefaultFoodModifiers,
  parseFoodModifiersConfig,
  parseFoodModifiersFromMetadata,
  parseFoodModifiersJson,
  serializeFoodModifiersJson,
  hasFoodModifiers,
  type FoodModifierOption,
  type FoodModifierGroup,
  type FoodModifiersConfig,
} from "@/lib/rubros/modules/alimentos/modifiers";

export {
  FOOD_MENU_CATEGORY_ORDER,
  groupProductsByFoodMenu,
  type FoodMenuSection,
} from "@/lib/rubros/modules/alimentos/menu";
