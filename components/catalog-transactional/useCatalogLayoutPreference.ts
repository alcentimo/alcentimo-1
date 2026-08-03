"use client";

import { useCallback, useEffect, useState } from "react";
import type { CatalogLayoutMode } from "@/lib/store-settings/types";
import {
  readStoredCatalogLayout,
  writeStoredCatalogLayout,
} from "@/lib/catalog/catalog-layout";

/** Preferencia de vista del visitante; cae al layout configurado por la tienda. */
export function useCatalogLayoutPreference(
  storeSlug: string,
  defaultLayout: CatalogLayoutMode,
): {
  layout: CatalogLayoutMode;
  setLayout: (layout: CatalogLayoutMode) => void;
} {
  const [layout, setLayoutState] = useState<CatalogLayoutMode>(defaultLayout);

  useEffect(() => {
    const stored = readStoredCatalogLayout(storeSlug);
    setLayoutState(stored ?? defaultLayout);
  }, [storeSlug, defaultLayout]);

  const setLayout = useCallback(
    (next: CatalogLayoutMode) => {
      setLayoutState(next);
      writeStoredCatalogLayout(storeSlug, next);
    },
    [storeSlug],
  );

  return { layout, setLayout };
}
