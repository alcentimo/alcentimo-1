/**
 * Módulo de producto: Ropa y Moda.
 * Se importa solo cuando `getActiveProductModuleId(rubro) === "ropa-moda"`.
 */
export {
  ROPA_MODA_MODULE_ID,
  ROPA_MODA_SIZE_PRESETS,
  ROPA_MODA_PANTS_SIZE_PRESETS,
  ROPA_MODA_SHOE_SIZE_EUR_PRESETS,
  ROPA_MODA_SHOE_SIZE_US_PRESETS,
  ROPA_MODA_ALL_SIZE_PRESETS,
  ROPA_MODA_SHOE_SIZE_CM_GUIDE,
  ROPA_MODA_COLOR_PRESETS,
  ROPA_MODA_COLOR_SWATCHES,
  ROPA_MODA_ATTR_TALLA,
  ROPA_MODA_ATTR_COLOR,
  ROPA_MODA_ATTR_LONGITUD_CM,
  isFashionShoeSize,
  getDefaultShoeLengthCm,
  normalizeShoeLengthCm,
  getFashionColorSwatch,
  type FashionProductKind,
  type FashionShoeSizeSystem,
  FASHION_PRODUCT_KIND_OPTIONS,
  FASHION_SHOE_SIZE_SYSTEM_OPTIONS,
  isFashionClothingSize,
  isFashionEurShoeSize,
  isFashionUsShoeSize,
  inferFashionProductKind,
  inferFashionShoeSizeSystem,
  filterSizesForFashionKind,
  filterSizesForShoeSystem,
} from "@/lib/rubros/modules/ropa-moda/config";

export {
  fashionVariantKey,
  formatFashionVariantName,
  parseFashionVariantName,
  getFashionAttributes,
  looksLikeFashionVariants,
  emptyFashionMatrix,
  createDefaultFashionMatrix,
  variantsToFashionMatrix,
  fashionMatrixToVariants,
  fashionMatrixHasDetailedStock,
  pruneFashionSizeLengthCm,
  type FashionMatrixState,
} from "@/lib/rubros/modules/ropa-moda/matrix";
