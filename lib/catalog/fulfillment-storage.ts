import type { CatalogFulfillmentMode } from "@/components/catalog-transactional/CatalogFulfillmentProvider";

const MODE_KEY = "mode";
const LOCATION_KEY = "locationId";
const BOOTSTRAPPED_KEY = "bootstrapped";

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

/** True si ya resolvimos sede (default/geo/manual) para no volver a pedir geolocalización. */
export function hasFulfillmentBootstrapped(storeSlug: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.localStorage.getItem(storageKey(storeSlug, BOOTSTRAPPED_KEY)) ===
      "1"
    );
  } catch {
    return false;
  }
}

export function markFulfillmentBootstrapped(storeSlug: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(storeSlug, BOOTSTRAPPED_KEY), "1");
  } catch {
    // ignore
  }
}
