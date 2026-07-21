"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  DEFAULT_PLATFORM_SETTINGS,
  type PlatformSettings,
} from "@/lib/platform/platform-settings";

const PlatformSettingsContext = createContext<PlatformSettings>(
  DEFAULT_PLATFORM_SETTINGS,
);

export function PlatformSettingsProvider({
  settings,
  children,
}: {
  settings: PlatformSettings;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      platformName: settings.platformName || DEFAULT_PLATFORM_SETTINGS.platformName,
      tagline: settings.tagline || DEFAULT_PLATFORM_SETTINGS.tagline,
      logoUrl: settings.logoUrl,
      pwaIcon192Url: settings.pwaIcon192Url,
      pwaIcon512Url: settings.pwaIcon512Url,
      supportEmail: settings.supportEmail,
    }),
    [settings],
  );

  return (
    <PlatformSettingsContext.Provider value={value}>
      {children}
    </PlatformSettingsContext.Provider>
  );
}

export function usePlatformSettings(): PlatformSettings {
  return useContext(PlatformSettingsContext);
}
