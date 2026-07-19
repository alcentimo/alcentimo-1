/**
 * Vista Previa Inteligente — motor unificado de intercambio de assets y rendimiento.
 *
 * - Diccionario de mockups por rubro (datos + imágenes WebP)
 * - Prefetch condicional: solo el rubro seleccionado
 * - Catálogo de referencia coherente (nombres, tips, precios)
 */
export {
  REFERENCE_RUBRO_ASSETS,
  getReferenceRubroAssets,
  getReferenceRubroImageUrls,
  resolveReferenceAssetUrl,
  prefetchReferenceRubroAssets,
  isReferenceRubroAssetsCached,
  type ReferenceRubroAssetKey,
  type ReferenceRubroAssetMap,
} from "@/lib/catalog/reference-rubro-assets";

export {
  getReferenceCatalogForStore,
  REFERENCE_CATALOG_LIMIT,
  type ReferenceCatalogResult,
} from "@/lib/catalog/rubro-preview-products";

export {
  useSmartPreviewRubro,
  SMART_PREVIEW_FADE_MS,
} from "@/lib/catalog/use-smart-preview-rubro";
