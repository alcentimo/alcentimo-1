/**
 * Módulo de producto: Ropa y Moda.
 * Se importa solo cuando `getActiveProductModuleId(rubro) === "ropa-moda"`.
 */
export {
  ROPA_MODA_MODULE_ID,
  ROPA_MODA_SIZE_PRESETS,
  ROPA_MODA_COLOR_PRESETS,
  ROPA_MODA_ATTR_TALLA,
  ROPA_MODA_ATTR_COLOR,
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
  type FashionMatrixState,
} from "@/lib/rubros/modules/ropa-moda/matrix";
