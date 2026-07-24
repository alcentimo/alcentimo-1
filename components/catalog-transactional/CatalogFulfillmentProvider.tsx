"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { StoreLocation } from "@/lib/locations/types";
import type { VariantLocationStock } from "@/lib/locations/types";

export type CatalogFulfillmentMode = "delivery" | "pickup";

interface CatalogFulfillmentContextValue {
  locations: StoreLocation[];
  multiLocation: boolean;
  mode: CatalogFulfillmentMode;
  selectedLocationId: string | null;
  setMode: (mode: CatalogFulfillmentMode) => void;
  setSelectedLocationId: (id: string | null) => void;
  getAvailableStock: (variantId: string | null | undefined, fallback: number) => number;
  selectedLocation: StoreLocation | null;
}

const CatalogFulfillmentContext =
  createContext<CatalogFulfillmentContextValue | null>(null);

export function CatalogFulfillmentProvider({
  locations,
  locationStocks,
  children,
}: {
  locations: StoreLocation[];
  locationStocks: VariantLocationStock[];
  children: ReactNode;
}) {
  const activeLocations = useMemo(
    () => locations.filter((loc) => loc.is_active),
    [locations],
  );
  const multiLocation = activeLocations.length > 1;
  const defaultLocation =
    activeLocations.find((loc) => loc.is_default) ?? activeLocations[0] ?? null;

  const [mode, setMode] = useState<CatalogFulfillmentMode>("delivery");
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    defaultLocation?.id ?? null,
  );

  const stockIndex = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of locationStocks) {
      map.set(`${row.variant_id}:${row.location_id}`, row.available_stock);
    }
    return map;
  }, [locationStocks]);

  const getAvailableStock = useCallback(
    (variantId: string | null | undefined, fallback: number) => {
      if (!variantId) return fallback;

      const locationId = selectedLocationId ?? defaultLocation?.id;
      if (!locationId) return fallback;

      const key = `${variantId}:${locationId}`;
      return stockIndex.has(key) ? (stockIndex.get(key) ?? 0) : fallback;
    },
    [defaultLocation?.id, selectedLocationId, stockIndex],
  );

  const selectedLocation =
    activeLocations.find((loc) => loc.id === selectedLocationId) ??
    defaultLocation;

  const value = useMemo(
    () => ({
      locations: activeLocations,
      multiLocation,
      mode,
      selectedLocationId: selectedLocation?.id ?? null,
      setMode,
      setSelectedLocationId,
      getAvailableStock,
      selectedLocation,
    }),
    [
      activeLocations,
      multiLocation,
      mode,
      selectedLocation,
      getAvailableStock,
    ],
  );

  return (
    <CatalogFulfillmentContext.Provider value={value}>
      {children}
    </CatalogFulfillmentContext.Provider>
  );
}

export function useCatalogFulfillment(): CatalogFulfillmentContextValue {
  const ctx = useContext(CatalogFulfillmentContext);
  if (!ctx) {
    return {
      locations: [],
      multiLocation: false,
      mode: "delivery",
      selectedLocationId: null,
      setMode: () => undefined,
      setSelectedLocationId: () => undefined,
      getAvailableStock: (_variantId, fallback) => fallback,
      selectedLocation: null,
    };
  }
  return ctx;
}
