"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { StoreLocation } from "@/lib/locations/types";
import type { VariantLocationStock } from "@/lib/locations/types";
import {
  readFulfillmentPrefs,
  writeFulfillmentPrefs,
} from "@/lib/catalog/fulfillment-storage";

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
  storeSlug,
  locations,
  locationStocks,
  children,
}: {
  storeSlug: string;
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

  const storedPrefs = useMemo(
    () => readFulfillmentPrefs(storeSlug),
    [storeSlug],
  );

  const initialLocationId = useMemo(() => {
    const storedId = storedPrefs.selectedLocationId;
    if (storedId && activeLocations.some((loc) => loc.id === storedId)) {
      return storedId;
    }
    return defaultLocation?.id ?? null;
  }, [activeLocations, defaultLocation?.id, storedPrefs.selectedLocationId]);

  const [mode, setModeState] = useState<CatalogFulfillmentMode>(
    storedPrefs.mode ?? "delivery",
  );
  const [selectedLocationId, setSelectedLocationIdState] = useState<string | null>(
    initialLocationId,
  );

  useEffect(() => {
    setSelectedLocationIdState(initialLocationId);
  }, [initialLocationId]);

  const setMode = useCallback(
    (nextMode: CatalogFulfillmentMode) => {
      setModeState(nextMode);
      writeFulfillmentPrefs(storeSlug, {
        mode: nextMode,
        selectedLocationId: selectedLocationId ?? defaultLocation?.id ?? null,
      });
    },
    [defaultLocation?.id, selectedLocationId, storeSlug],
  );

  const setSelectedLocationId = useCallback(
    (id: string | null) => {
      setSelectedLocationIdState(id);
      writeFulfillmentPrefs(storeSlug, {
        mode,
        selectedLocationId: id,
      });
    },
    [mode, storeSlug],
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
      if (activeLocations.length === 0) return fallback;

      const hasAnyLocationRow = locationStocks.some(
        (row) => row.variant_id === variantId,
      );
      if (!hasAnyLocationRow) return fallback;

      const locationId = selectedLocationId ?? defaultLocation?.id;
      if (!locationId) return fallback;

      const key = `${variantId}:${locationId}`;
      return stockIndex.has(key) ? (stockIndex.get(key) ?? 0) : fallback;
    },
    [
      activeLocations.length,
      defaultLocation?.id,
      locationStocks,
      selectedLocationId,
      stockIndex,
    ],
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
      setMode,
      setSelectedLocationId,
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
