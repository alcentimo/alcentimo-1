import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getPublicServerClient } from "@/lib/supabase/public-server";
import {
  DEFAULT_PLATFORM_SETTINGS,
  parsePlatformSettingsRow,
  PLATFORM_SETTINGS_ID,
  type PlatformSettings,
  type PlatformSettingsRow,
} from "@/lib/platform/platform-settings";

const SELECT_WITH_SHIPPING =
  "id, platform_name, tagline, logo_url, pwa_icon_192_url, pwa_icon_512_url, support_email, plans_coupon_box_enabled, bcv_rate_mode, manual_bcv_rate, dropship_platform_markup_percent, dropship_shipping, updated_at, updated_by";

const SELECT_WITH_MARKUP =
  "id, platform_name, tagline, logo_url, pwa_icon_192_url, pwa_icon_512_url, support_email, plans_coupon_box_enabled, bcv_rate_mode, manual_bcv_rate, dropship_platform_markup_percent, updated_at, updated_by";

const SELECT_WITH_BCV =
  "id, platform_name, tagline, logo_url, pwa_icon_192_url, pwa_icon_512_url, support_email, plans_coupon_box_enabled, bcv_rate_mode, manual_bcv_rate, updated_at, updated_by";

const SELECT_LEGACY =
  "id, platform_name, tagline, logo_url, pwa_icon_192_url, pwa_icon_512_url, support_email, plans_coupon_box_enabled, updated_at, updated_by";

async function loadPlatformSettingsFromClient(
  supabase: SupabaseClient,
): Promise<PlatformSettings> {
  const selects = [
    SELECT_WITH_SHIPPING,
    SELECT_WITH_MARKUP,
    SELECT_WITH_BCV,
    SELECT_LEGACY,
  ];

  for (const select of selects) {
    const { data, error } = await supabase
      .from("platform_settings")
      .select(select)
      .eq("id", PLATFORM_SETTINGS_ID)
      .maybeSingle();

    if (!error && data) {
      return parsePlatformSettingsRow(data as unknown as PlatformSettingsRow);
    }
  }

  return { ...DEFAULT_PLATFORM_SETTINGS };
}

/**
 * Lee public.platform_settings. Si falla, devuelve defaults.
 * Cacheado por request (React cache). Solo servidor.
 */
export const fetchPlatformSettings = cache(async (): Promise<PlatformSettings> => {
  try {
    const supabase = await createClient();
    return await loadPlatformSettingsFromClient(supabase);
  } catch {
    return { ...DEFAULT_PLATFORM_SETTINGS };
  }
});

/**
 * Lectura pública (service role / anon) para vitrinas y checkout.
 * No depende de cookies de sesión.
 */
export const fetchPublicPlatformSettings = cache(
  async (): Promise<PlatformSettings> => {
    try {
      const supabase = getPublicServerClient();
      return await loadPlatformSettingsFromClient(supabase);
    } catch {
      return { ...DEFAULT_PLATFORM_SETTINGS };
    }
  },
);
