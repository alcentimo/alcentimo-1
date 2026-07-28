import type { StoreLocation } from "@/lib/locations/types";

const GEO_TIMEOUT_MS = 8_000;

function normalizePlace(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getCurrentPosition(): Promise<GeolocationPosition | null> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      () => resolve(null),
      {
        enableHighAccuracy: false,
        maximumAge: 5 * 60_000,
        timeout: GEO_TIMEOUT_MS,
      },
    );
  });
}

interface ReverseGeocodePlace {
  city: string;
  town: string;
  village: string;
  municipality: string;
  county: string;
  state: string;
  displayName: string;
}

async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodePlace | null> {
  try {
    const url = new URL("/api/geo/reverse", window.location.origin);
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));

    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      GEO_TIMEOUT_MS,
    );
    const response = await fetch(url.toString(), {
      signal: controller.signal,
    }).finally(() => window.clearTimeout(timeoutId));

    if (!response.ok) return null;

    const data = (await response.json()) as Partial<ReverseGeocodePlace>;
    return {
      city: data.city ?? "",
      town: data.town ?? "",
      village: data.village ?? "",
      municipality: data.municipality ?? "",
      county: data.county ?? "",
      state: data.state ?? "",
      displayName: data.displayName ?? "",
    };
  } catch {
    return null;
  }
}

function placeTokens(place: ReverseGeocodePlace): string[] {
  const raw = [
    place.city,
    place.town,
    place.village,
    place.municipality,
    place.county,
    place.state,
    place.displayName,
  ]
    .map(normalizePlace)
    .filter(Boolean);

  return [...new Set(raw)];
}

function locationMatchesPlace(
  location: StoreLocation,
  tokens: string[],
): boolean {
  const city = normalizePlace(location.city);
  const name = normalizePlace(location.name);
  const address = normalizePlace(location.address);
  if (!city && !name && !address) return false;

  return tokens.some((token) => {
    if (city && (token === city || token.includes(city) || city.includes(token))) {
      return true;
    }
    if (name && token.length >= 4 && (token.includes(name) || name.includes(token))) {
      return true;
    }
    if (
      address &&
      city &&
      token.length >= 4 &&
      address.includes(token)
    ) {
      return true;
    }
    return false;
  });
}

/** Elige la sede más cercana por ciudad (geolocalización + reverse geocode). */
export async function resolveNearestStoreLocation(
  locations: StoreLocation[],
): Promise<StoreLocation | null> {
  const active = locations.filter((loc) => loc.is_active);
  if (active.length === 0) return null;

  const position = await getCurrentPosition();
  if (!position) return null;

  const place = await reverseGeocode(
    position.coords.latitude,
    position.coords.longitude,
  );
  if (!place) return null;

  const tokens = placeTokens(place);
  if (tokens.length === 0) return null;

  const matches = active.filter((loc) => locationMatchesPlace(loc, tokens));
  if (matches.length === 0) return null;

  return matches.find((loc) => loc.is_default) ?? matches[0] ?? null;
}
