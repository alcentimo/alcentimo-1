"use client";

import { useLayoutEffect } from "react";
import { getCatalogServiceWorkerScope } from "@/lib/pwa/catalog-sw-paths";

interface CatalogPwaHeadLinksProps {
  manifestAbsoluteUrl: string;
  storeSlug: string;
}

/**
 * Inyecta <link rel="manifest"> absoluto en <head>.
 * Chrome exige ver el manifiesto del catálogo en la página actual (no el admin de /).
 */
export function CatalogPwaHeadLinks({
  manifestAbsoluteUrl,
  storeSlug,
}: CatalogPwaHeadLinksProps) {
  useLayoutEffect(() => {
    document.querySelectorAll('link[rel="manifest"]').forEach((node) => {
      if (node.getAttribute("href") !== manifestAbsoluteUrl) {
        node.remove();
      }
    });

    if (
      !document.querySelector(`link[rel="manifest"][href="${manifestAbsoluteUrl}"]`)
    ) {
      const manifestLink = document.createElement("link");
      manifestLink.setAttribute("rel", "manifest");
      manifestLink.setAttribute("href", manifestAbsoluteUrl);
      document.head.prepend(manifestLink);
    }

    document.documentElement.dataset.catalogPwaScope =
      getCatalogServiceWorkerScope(storeSlug);
  }, [manifestAbsoluteUrl, storeSlug]);

  return null;
}
