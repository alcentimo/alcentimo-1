export const STORE_COUNTRY_OPTIONS = ["Venezuela"] as const;

export type StoreCountryOption = (typeof STORE_COUNTRY_OPTIONS)[number];

export const DEFAULT_STORE_COUNTRY: StoreCountryOption = "Venezuela";

export function isStoreCountryOption(value: string): value is StoreCountryOption {
  return (STORE_COUNTRY_OPTIONS as readonly string[]).includes(value);
}
