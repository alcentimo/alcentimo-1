"use client";

import { useEffect, useState } from "react";
import type { StoreRubro } from "@/src/config/categories";
import {
  isReferenceRubroAssetsCached,
  prefetchAllReferenceRubroAssets,
  prefetchReferenceRubroAssets,
} from "@/lib/catalog/reference-rubro-assets";

interface UseReferenceRubroAssetsResult {
  /** true mientras se pre-cargan imágenes del rubro seleccionado. */
  isPrefetching: boolean;
}

/**
 * Escucha el rubro del selector y pre-carga su colección de assets
 * para que el intercambio visual sea fluido y sin parpadeos.
 */
export function useReferenceRubroAssets(
  selectedRubro: StoreRubro,
): UseReferenceRubroAssetsResult {
  const [isPrefetching, setIsPrefetching] = useState(false);

  useEffect(() => {
    void prefetchAllReferenceRubroAssets();
  }, []);

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
