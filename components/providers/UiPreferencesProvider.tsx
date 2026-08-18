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
import { ThemeProvider } from "next-themes";
import {
  NAV_LABEL_KEYS,
  translate,
  type MessageKey,
} from "@/lib/i18n/messages";
import {
  readStoredLocale,
  writeStoredLocale,
  type UiLocale,
} from "@/lib/ui-preferences/storage";
import type { InterfacePreferencesSettings } from "@/lib/store-settings/types";

interface LocaleContextValue {
  locale: UiLocale;
  setLocale: (locale: UiLocale) => void;
  t: (key: MessageKey) => string;
  navLabel: (href: string, fallback: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function LocaleProvider({
  children,
  initialLocale = "es",
}: {
  children: ReactNode;
  initialLocale?: UiLocale;
}) {
  const [locale, setLocaleState] = useState<UiLocale>(initialLocale);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStoredLocale(initialLocale);
    setLocaleState(stored);
    document.documentElement.lang = stored;
    setHydrated(true);
  }, [initialLocale]);

  const setLocale = useCallback((next: UiLocale) => {
    setLocaleState(next);
    writeStoredLocale(next);
    document.documentElement.lang = next;
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale: hydrated ? locale : initialLocale,
      setLocale,
      t: (key) => translate(hydrated ? locale : initialLocale, key),
      navLabel: (href, fallback) => {
        const key = NAV_LABEL_KEYS[href];
        return key
          ? translate(hydrated ? locale : initialLocale, key)
          : fallback;
      },
    }),
    [hydrated, locale, initialLocale, setLocale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within UiPreferencesProvider");
  }
  return ctx;
}

export function useOptionalLocale(): LocaleContextValue | null {
  return useContext(LocaleContext);
}

interface UiPreferencesProviderProps {
  children: ReactNode;
  initialPreferences?: InterfacePreferencesSettings | null;
}

export function UiPreferencesProvider({
  children,
  initialPreferences = null,
}: UiPreferencesProviderProps) {
  const initialLocale = initialPreferences?.locale ?? "es";

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      storageKey="alcentimo-ui-theme"
      disableTransitionOnChange
    >
      <LocaleProvider initialLocale={initialLocale}>{children}</LocaleProvider>
    </ThemeProvider>
  );
}
