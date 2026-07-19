"use client";

import { useEffect, useState } from "react";
import type { StoreRubro } from "@/src/config/categories";
import {
  isReferenceRubroAssetsCached,
  prefetchReferenceRubroAssets,
} from "@/lib/catalog/reference-rubro-assets";

/** Duración estándar del fade al intercambiar rubro (ms). */
export const SMART_PREVIEW_FADE_MS = 300;

interface UseSmartPreviewRubroResult {
  /** true mientras se pre-cargan imágenes del rubro seleccionado. */
  isPrefetching: boolean;
}

/**
 * Escucha el rubro del selector sandbox y pre-carga solo su colección de assets.
 * Nunca descarga el paquete completo — carga condicional por rubro.
 */
export function useSmartPreviewRubro(
  selectedRubro: StoreRubro,
): UseSmartPreviewRubroResult {
  const [isPrefetching, setIsPrefetching] = useState(false);

  useEffect(() => {
    if (isReferenceRubroAssetsCached(selectedRubro)) {
      setIsPrefetching(false);
      return;
    }

    let cancelled = false;
    setIsPrefetching(true);

    void prefetchReferenceRubroAssets(selectedRubro).finally(() => {
      if (!cancelled) setIsPrefetching(false);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedRubro]);

  return { isPrefetching };
}

/** @deprecated Usar useSmartPreviewRubro */
export const useReferenceRubroAssets = useSmartPreviewRubro;
