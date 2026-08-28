"use client";

import { useCallback, useEffect, useRef } from "react";
import type { CatalogListItem } from "@/lib/database.types";
import { fetchPublicCatalogProductById } from "@/lib/catalog/public-actions";
import { useCatalogProductDetail } from "@/components/catalog/CatalogProductDetailHost";

/**
 * Abre la ficha de producto desde `?product=` o al hacer clic en el banner.
 * Si el producto no está en la página actual (paginación), lo carga por id.
 */
export function useOpenCatalogProductById(
  storeSlug: string,
  products: CatalogListItem[],
  initialProductId?: string | null,
) {
  const { openProduct } = useCatalogProductDetail();
  const openedInitialRef = useRef<string | null>(null);
  const pendingRef = useRef(false);

  const openProductById = useCallback(
    async (productId: string) => {
      const id = productId.trim();
      if (!id || pendingRef.current) return;

      const normalized = id.toLowerCase();
      const local = products.find(
        (product) =>
          product.product_id.toLowerCase() === normalized ||
          product.product_slug.toLowerCase() === normalized,
      );
      if (local) {
        openProduct(local);
        return;
      }

      pendingRef.current = true;
      try {
        const result = await fetchPublicCatalogProductById(storeSlug, id);
        if (result.product) {
          openProduct(result.product);
        }
      } finally {
        pendingRef.current = false;
      }
    },
    [openProduct, products, storeSlug],
  );

  useEffect(() => {
    const id = initialProductId?.trim();
    if (!id || openedInitialRef.current === id) return;
    openedInitialRef.current = id;
    void openProductById(id);
  }, [initialProductId, openProductById]);

  return openProductById;
}
