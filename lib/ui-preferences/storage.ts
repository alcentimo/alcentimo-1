export const UI_LOCALE_STORAGE_KEY = "alcentimo-ui-locale";
export const UI_THEME_STORAGE_KEY = "alcentimo-ui-theme";

export type UiLocale = "es" | "en";
export type UiTheme = "light" | "dark" | "system";

export const UI_LOCALE_OPTIONS: { value: UiLocale; label: string }[] = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
];

export function isUiLocale(value: unknown): value is UiLocale {
  return value === "es" || value === "en";
}

export function isUiTheme(value: unknown): value is UiTheme {
  return value === "light" || value === "dark" || value === "system";
}

export function readStoredLocale(fallback: UiLocale = "es"): UiLocale {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(UI_LOCALE_STORAGE_KEY);
    return isUiLocale(raw) ? raw : fallback;
  } catch {
    return fallback;
  }
}

export function writeStoredLocale(locale: UiLocale) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(UI_LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}
