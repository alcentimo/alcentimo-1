"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CatalogListItem } from "@/lib/database.types";
import {
  CATALOG_PRODUCT_HISTORY_KEY,
  buildCatalogListingLocation,
  buildCatalogProductLocation,
  productKeyMatches,
  readCatalogProductKeyFromLocation,
  type CatalogProductHistoryState,
} from "@/lib/catalog/catalog-product-url";

interface CatalogProductDetailContextValue {
  selectedProduct: CatalogListItem | null;
  openProduct: (product: CatalogListItem) => void;
  closeProduct: () => void;
}

const CatalogProductDetailContext =
  createContext<CatalogProductDetailContextValue | null>(null);

interface CatalogProductDetailProviderProps {
  children: ReactNode;
  storeId?: string | null;
  storeSlug?: string | null;
  /** Actualiza la URL del navegador con `/producto/{slug}` (campañas). */
  syncProductUrl?: boolean;
}

function currentHref(): { pathname: string; search: string; hash: string } {
  return {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
  };
}

function replaceBrowserLocation(next: string) {
  const current =
    window.location.pathname + window.location.search + window.location.hash;
  if (current === next) return;
  window.history.replaceState(window.history.state, "", next);
}

function pushBrowserLocation(
  next: string,
  state: CatalogProductHistoryState,
) {
  const current =
    window.location.pathname + window.location.search + window.location.hash;
  if (current === next) {
    window.history.replaceState(
      { ...window.history.state, ...state },
      "",
      next,
    );
    return;
  }
  window.history.pushState({ ...window.history.state, ...state }, "", next);
}

export function CatalogProductDetailProvider({
  children,
  storeId = null,
  storeSlug = null,
  syncProductUrl = true,
}: CatalogProductDetailProviderProps) {
  const [selectedProduct, setSelectedProduct] =
    useState<CatalogListItem | null>(null);
  const selectedRef = useRef<CatalogListItem | null>(null);
  const ignorePopRef = useRef(false);
  const pushedRef = useRef(false);

  selectedRef.current = selectedProduct;

  const trackProductView = useCallback(
    (product: CatalogListItem) => {
      if (storeId && storeSlug && product.product_id) {
        void fetch("/api/analytics/visit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "product",
            storeId,
            storeSlug,
            productId: product.product_id,
          }),
          keepalive: true,
        }).catch(() => {
          // Silenciar errores de tracking.
        });
      }
    },
    [storeId, storeSlug],
  );

  const applyProductUrl = useCallback(
    (product: CatalogListItem, mode: "push" | "replace") => {
      if (!syncProductUrl || !storeSlug || !product.product_slug) return;
      const { pathname, search, hash } = currentHref();
      const next = buildCatalogProductLocation(
        storeSlug,
        product.product_slug,
        pathname,
        search,
        hash,
      );
      const state: CatalogProductHistoryState = {
        [CATALOG_PRODUCT_HISTORY_KEY]: {
          productId: product.product_id,
          productSlug: product.product_slug,
        },
      };
      if (mode === "push") {
        pushBrowserLocation(next, state);
        pushedRef.current = true;
      } else {
        window.history.replaceState(
          { ...window.history.state, ...state },
          "",
          next,
        );
      }
    },
    [storeSlug, syncProductUrl],
  );

  const openProduct = useCallback(
    (product: CatalogListItem) => {
      const current = selectedRef.current;
      setSelectedProduct(product);
      trackProductView(product);

      if (!syncProductUrl || !storeSlug) return;

      const { pathname, search } = currentHref();
      const urlKey = readCatalogProductKeyFromLocation(pathname, search);
      const alreadyOnProduct = productKeyMatches(product, urlKey);

      if (alreadyOnProduct && current?.product_id === product.product_id) {
        applyProductUrl(product, "replace");
        return;
      }

      if (alreadyOnProduct && !current) {
        applyProductUrl(product, "replace");
        return;
      }

      applyProductUrl(product, "push");
    },
    [applyProductUrl, storeSlug, syncProductUrl, trackProductView],
  );

  const closeProduct = useCallback(() => {
    const closing = selectedRef.current;
    setSelectedProduct(null);

    if (!syncProductUrl || !storeSlug || !closing) return;

    if (pushedRef.current) {
      ignorePopRef.current = true;
      pushedRef.current = false;
      window.history.back();
      return;
    }

    const { pathname, search, hash } = currentHref();
    replaceBrowserLocation(
      buildCatalogListingLocation(storeSlug, pathname, search, hash),
    );
  }, [storeSlug, syncProductUrl]);

  useEffect(() => {
    if (!syncProductUrl || !storeSlug) return;

    function handlePopState() {
      if (ignorePopRef.current) {
        ignorePopRef.current = false;
        pushedRef.current = false;
        setSelectedProduct(null);
        return;
      }

      const { pathname, search } = currentHref();
      const key = readCatalogProductKeyFromLocation(pathname, search);
      const current = selectedRef.current;
      if (current && productKeyMatches(current, key)) return;
      if (!key) {
        pushedRef.current = false;
        setSelectedProduct(null);
      }
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [storeSlug, syncProductUrl]);

  const value = useMemo(
    () => ({
      selectedProduct,
      openProduct,
      closeProduct,
    }),
    [selectedProduct, openProduct, closeProduct],
  );

  return (
    <CatalogProductDetailContext.Provider value={value}>
      {children}
    </CatalogProductDetailContext.Provider>
  );
}

export function useCatalogProductDetail(): CatalogProductDetailContextValue {
  const context = useContext(CatalogProductDetailContext);
  if (!context) {
    throw new Error(
      "useCatalogProductDetail debe usarse dentro de CatalogProductDetailProvider.",
    );
  }
  return context;
}

export function useCatalogProductDetailOptional(): CatalogProductDetailContextValue | null {
  return useContext(CatalogProductDetailContext);
}
