"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import type {
  MercadoCatalogFacets,
  MercadoProductCard,
} from "@/lib/mercado-oculto/types";
import {
  EMPTY_MERCADO_FILTERS,
  filterMercadoProducts,
  filtersFromSearchParams,
  filtersToQueryString,
  type MercadoCatalogFilters,
} from "@/lib/mercado-oculto/filter-catalog";

type MercadoCatalogContextValue = {
  allProducts: MercadoProductCard[];
  facets: MercadoCatalogFacets;
  filters: MercadoCatalogFilters;
  filteredProducts: MercadoProductCard[];
  pending: boolean;
  error: string | null;
  setFilters: (
    mutate: (current: MercadoCatalogFilters) => MercadoCatalogFilters,
  ) => void;
  replaceFilters: (next: MercadoCatalogFilters) => void;
  clearFilters: () => void;
};

const MercadoCatalogContext =
  createContext<MercadoCatalogContextValue | null>(null);

function syncUrl(filters: MercadoCatalogFilters) {
  if (typeof window === "undefined") return;
  const qs = filtersToQueryString(filters);
  const next = qs ? `/mercado-oculto?${qs}` : "/mercado-oculto";
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === next) return;
  window.history.replaceState(
    { ...window.history.state, mercadoFilters: filters },
    "",
    next,
  );
}

interface MercadoCatalogProviderProps {
  products: MercadoProductCard[];
  facets: MercadoCatalogFacets;
  error?: string | null;
  initialFilters?: MercadoCatalogFilters;
  children: React.ReactNode;
}

export function MercadoCatalogProvider({
  products,
  facets,
  error = null,
  initialFilters = EMPTY_MERCADO_FILTERS,
  children,
}: MercadoCatalogProviderProps) {
  const [filters, setFiltersState] =
    useState<MercadoCatalogFilters>(initialFilters);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onPopState = () => {
      setFiltersState(
        filtersFromSearchParams(new URLSearchParams(window.location.search)),
      );
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const replaceFilters = useCallback((next: MercadoCatalogFilters) => {
    startTransition(() => {
      setFiltersState(next);
      syncUrl(next);
    });
  }, []);

  const setFilters = useCallback(
    (mutate: (current: MercadoCatalogFilters) => MercadoCatalogFilters) => {
      startTransition(() => {
        setFiltersState((current) => {
          const next = mutate(current);
          syncUrl(next);
          return next;
        });
      });
    },
    [],
  );

  const clearFilters = useCallback(() => {
    replaceFilters(EMPTY_MERCADO_FILTERS);
  }, [replaceFilters]);

  const filteredProducts = useMemo(
    () => filterMercadoProducts(products, filters),
    [products, filters],
  );

  const value = useMemo<MercadoCatalogContextValue>(
    () => ({
      allProducts: products,
      facets,
      filters,
      filteredProducts,
      pending,
      error,
      setFilters,
      replaceFilters,
      clearFilters,
    }),
    [
      products,
      facets,
      filters,
      filteredProducts,
      pending,
      error,
      setFilters,
      replaceFilters,
      clearFilters,
    ],
  );

  return (
    <MercadoCatalogContext.Provider value={value}>
      {children}
    </MercadoCatalogContext.Provider>
  );
}

export function useMercadoCatalog() {
  const ctx = useContext(MercadoCatalogContext);
  if (!ctx) {
    throw new Error(
      "useMercadoCatalog must be used within MercadoCatalogProvider",
    );
  }
  return ctx;
}

/** Optional hook when catalog may not be mounted (carrito / chats). */
export function useMercadoCatalogOptional() {
  return useContext(MercadoCatalogContext);
}
