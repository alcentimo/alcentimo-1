import type { FashionShoeSizeSystem } from "@/lib/rubros/modules/ropa-moda/config";

export const FASHION_SHOE_SIZE_SYSTEM_STORAGE_KEY =
  "alcentimo-fashion-shoe-size-system";

export function isFashionShoeSizeSystem(
  value: unknown,
): value is FashionShoeSizeSystem {
  return value === "eur" || value === "us";
}

/** Último sistema EUR/US elegido por el dueño en el formulario de productos. */
export function readPreferredFashionShoeSizeSystem(
  fallback: FashionShoeSizeSystem = "eur",
): FashionShoeSizeSystem {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(
      FASHION_SHOE_SIZE_SYSTEM_STORAGE_KEY,
    );
    return isFashionShoeSizeSystem(raw) ? raw : fallback;
  } catch {
    return fallback;
  }
}

export function writePreferredFashionShoeSizeSystem(
  system: FashionShoeSizeSystem,
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FASHION_SHOE_SIZE_SYSTEM_STORAGE_KEY, system);
  } catch {
    /* ignore quota / private mode */
  }
}
