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
import type { StoreLocation } from "@/lib/locations/types";
import type { VariantLocationStock } from "@/lib/locations/types";
import {
  hasFulfillmentBootstrapped,
  markFulfillmentBootstrapped,
  readFulfillmentPrefs,
  writeFulfillmentPrefs,
} from "@/lib/catalog/fulfillment-storage";
import { resolveNearestStoreLocation } from "@/lib/catalog/resolve-nearest-location";

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

function resolveDefaultLocationId(locations: StoreLocation[]): string | null {
  const active = locations.filter((loc) => loc.is_active);
  return (
    active.find((loc) => loc.is_default)?.id ?? active[0]?.id ?? null
  );
}

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
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Primera visita: sede guardada → geo (si hay varias) → sede principal; y persistir.
  useEffect(() => {
    let cancelled = false;

    async function bootstrapLocation() {
      const stored = readFulfillmentPrefs(storeSlug);
      const fallbackId = resolveDefaultLocationId(activeLocations);

      if (
        stored.selectedLocationId &&
        activeLocations.some((loc) => loc.id === stored.selectedLocationId)
      ) {
        setSelectedLocationIdState(stored.selectedLocationId);
        if (!hasFulfillmentBootstrapped(storeSlug)) {
          markFulfillmentBootstrapped(storeSlug);
        }
        return;
      }

      // Ya resolvimos antes (p. ej. sin geo): usar principal sin volver a preguntar.
      if (hasFulfillmentBootstrapped(storeSlug)) {
        if (fallbackId) {
          setSelectedLocationIdState(fallbackId);
          writeFulfillmentPrefs(storeSlug, {
            mode: stored.mode ?? modeRef.current,
            selectedLocationId: fallbackId,
          });
        }
        return;
      }

      // Asignación inmediata a la sede principal mientras intentamos geo.
      if (fallbackId) {
        setSelectedLocationIdState(fallbackId);
      }

      let resolvedId = fallbackId;
      if (activeLocations.length > 1) {
        const nearest = await resolveNearestStoreLocation(activeLocations);
        if (cancelled) return;
        if (nearest) {
          resolvedId = nearest.id;
        }
      }

      if (cancelled) return;

      if (resolvedId) {
        setSelectedLocationIdState(resolvedId);
        writeFulfillmentPrefs(storeSlug, {
          mode: stored.mode ?? modeRef.current,
          selectedLocationId: resolvedId,
        });
      }
      markFulfillmentBootstrapped(storeSlug);
    }

    void bootstrapLocation();
    return () => {
      cancelled = true;
    };
  }, [storeSlug, activeLocations]);

  const setMode = useCallback(
    (nextMode: CatalogFulfillmentMode) => {
      setModeState(nextMode);
      writeFulfillmentPrefs(storeSlug, {
        mode: nextMode,
        selectedLocationId: selectedLocationId ?? defaultLocation?.id ?? null,
      });
      markFulfillmentBootstrapped(storeSlug);
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
      markFulfillmentBootstrapped(storeSlug);
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
      // Una sola sede: usar stock del listado (misma fuente que el panel admin).
      if (activeLocations.length <= 1) return fallback;

      const hasAnyLocationRow = locationStocks.some(
        (row) => row.variant_id === variantId,
      );
      if (!hasAnyLocationRow) return fallback;

      const locationId = selectedLocationId ?? defaultLocation?.id;
      if (!locationId) return fallback;

      const key = `${variantId}:${locationId}`;
      // Sin fila para esta sede: no inventar stock del listado global.
      if (!stockIndex.has(key)) return 0;

      return stockIndex.get(key) ?? 0;
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
