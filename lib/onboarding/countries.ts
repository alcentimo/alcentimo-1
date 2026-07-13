export const STORE_COUNTRY_OPTIONS = [
  "Venezuela",
  "Colombia",
  "Argentina",
] as const;

export type StoreCountryOption = (typeof STORE_COUNTRY_OPTIONS)[number];

export function isStoreCountryOption(value: string): value is StoreCountryOption {
  return (STORE_COUNTRY_OPTIONS as readonly string[]).includes(value);
}
