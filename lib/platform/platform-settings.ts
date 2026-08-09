import { roundExchangeRate } from "@/lib/format";

export const PLATFORM_SETTINGS_ID = "default" as const;

export type BcvRateMode = "automatic" | "manual";

export interface PlatformSettings {
  platformName: string;
  tagline: string;
  logoUrl: string | null;
  pwaIcon192Url: string | null;
  pwaIcon512Url: string | null;
  supportEmail: string | null;
  /** Muestra u oculta el cajón «¿Tienes un cupón?» en /dashboard/planes. */
  plansCouponBoxEnabled: boolean;
  /** Fuente de la tasa BCV para conversión global. */
  bcvRateMode: BcvRateMode;
  /** Tasa manual de contingencia (null si no configurada). */
  manualBcvRate: number | null;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platformName: "Alcentimo",
  tagline: "Inventario y catálogo digital",
  logoUrl: null,
  pwaIcon192Url: null,
  pwaIcon512Url: null,
  supportEmail: null,
  plansCouponBoxEnabled: true,
  bcvRateMode: "automatic",
  manualBcvRate: null,
};

export interface PlatformSettingsRow {
  id: string;
  platform_name: string;
  tagline: string;
  logo_url: string | null;
  pwa_icon_192_url: string | null;
  pwa_icon_512_url: string | null;
  support_email: string | null;
  plans_coupon_box_enabled: boolean;
  bcv_rate_mode?: string | null;
  manual_bcv_rate?: number | string | null;
  updated_at: string;
  updated_by: string | null;
}

function parseBcvRateMode(value: unknown): BcvRateMode {
  return value === "manual" ? "manual" : "automatic";
}

function parseManualBcvRate(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return roundExchangeRate(n);
}

export function parsePlatformSettingsRow(
  row: PlatformSettingsRow | null | undefined,
): PlatformSettings {
  if (!row) return { ...DEFAULT_PLATFORM_SETTINGS };

  return {
    platformName: row.platform_name?.trim() || DEFAULT_PLATFORM_SETTINGS.platformName,
    tagline: row.tagline?.trim() || DEFAULT_PLATFORM_SETTINGS.tagline,
    logoUrl: row.logo_url?.trim() || null,
    pwaIcon192Url: row.pwa_icon_192_url?.trim() || null,
    pwaIcon512Url: row.pwa_icon_512_url?.trim() || null,
    supportEmail: row.support_email?.trim() || null,
    plansCouponBoxEnabled: row.plans_coupon_box_enabled ?? true,
    bcvRateMode: parseBcvRateMode(row.bcv_rate_mode),
    manualBcvRate: parseManualBcvRate(row.manual_bcv_rate),
  };
}
