import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_PLATFORM_SETTINGS,
  parsePlatformSettingsRow,
  PLATFORM_SETTINGS_ID,
  type PlatformSettings,
} from "@/lib/platform/platform-settings";

/**
 * Lee public.platform_settings. Si falla, devuelve defaults.
 * Cacheado por request (React cache). Solo servidor.
 */
export const fetchPlatformSettings = cache(async (): Promise<PlatformSettings> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("platform_settings")
      .select(
        "id, platform_name, tagline, logo_url, pwa_icon_192_url, pwa_icon_512_url, support_email, updated_at, updated_by",
      )
      .eq("id", PLATFORM_SETTINGS_ID)
      .maybeSingle();

    if (error || !data) {
      return { ...DEFAULT_PLATFORM_SETTINGS };
    }

    return parsePlatformSettingsRow(data);
  } catch {
    return { ...DEFAULT_PLATFORM_SETTINGS };
  }
});
