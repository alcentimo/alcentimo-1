export const PLATFORM_SETTINGS_ID = "default" as const;

export interface PlatformSettings {
  platformName: string;
  tagline: string;
  logoUrl: string | null;
  supportEmail: string | null;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platformName: "Alcentimo",
  tagline: "Inventario y catálogo digital",
  logoUrl: null,
  supportEmail: null,
};

export interface PlatformSettingsRow {
  id: string;
  platform_name: string;
  tagline: string;
  logo_url: string | null;
  support_email: string | null;
  updated_at: string;
  updated_by: string | null;
}

export function parsePlatformSettingsRow(
  row: PlatformSettingsRow | null | undefined,
): PlatformSettings {
  if (!row) return { ...DEFAULT_PLATFORM_SETTINGS };

  return {
    platformName: row.platform_name?.trim() || DEFAULT_PLATFORM_SETTINGS.platformName,
    tagline: row.tagline?.trim() || DEFAULT_PLATFORM_SETTINGS.tagline,
    logoUrl: row.logo_url?.trim() || null,
    supportEmail: row.support_email?.trim() || null,
  };
}
