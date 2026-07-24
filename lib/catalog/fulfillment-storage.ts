import type { CatalogFulfillmentMode } from "@/components/catalog-transactional/CatalogFulfillmentProvider";

const MODE_KEY = "mode";
const LOCATION_KEY = "locationId";

function storageKey(storeSlug: string, suffix: string): string {
  return `alcentimo-fulfillment-${storeSlug.trim().toLowerCase()}-${suffix}`;
}

export interface StoredFulfillmentPrefs {
  mode: CatalogFulfillmentMode;
  selectedLocationId: string | null;
}

export function readFulfillmentPrefs(storeSlug: string): Partial<StoredFulfillmentPrefs> {
  if (typeof window === "undefined") return {};

  try {
    const mode = window.localStorage.getItem(storageKey(storeSlug, MODE_KEY));
    const locationId = window.localStorage.getItem(storageKey(storeSlug, LOCATION_KEY));

    return {
      mode:
        mode === "pickup" || mode === "delivery" ? mode : undefined,
      selectedLocationId: locationId || undefined,
    };
  } catch {
    return {};
  }
}

export function writeFulfillmentPrefs(
  storeSlug: string,
  prefs: StoredFulfillmentPrefs,
): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey(storeSlug, MODE_KEY), prefs.mode);
    if (prefs.selectedLocationId) {
      window.localStorage.setItem(
        storageKey(storeSlug, LOCATION_KEY),
        prefs.selectedLocationId,
      );
    } else {
      window.localStorage.removeItem(storageKey(storeSlug, LOCATION_KEY));
    }
  } catch {
    // ignore quota / private mode
  }
}
