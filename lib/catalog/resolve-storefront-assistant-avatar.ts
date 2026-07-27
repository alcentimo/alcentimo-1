import {
  normalizeAssistantAvatarSettings,
  resolveAssistantAvatarCustomUrl,
  resolveAssistantAvatarPresetUrl,
} from "@/lib/store-settings/assistant-avatar";
import type { CatalogAssistantAvatarSettings } from "@/lib/store-settings/types";

/**
 * Resuelve la URL del avatar del asistente para el catálogo público.
 * `storeLogoFallback` incluye logo de tienda, foto del comerciante o icono PWA.
 */
export function resolveStorefrontAssistantAvatarUrl(
  settings: CatalogAssistantAvatarSettings | undefined,
  storeLogoFallback: string | null,
): string | null {
  const normalized = normalizeAssistantAvatarSettings(settings);

  if (normalized.mode === "store-logo") {
    return storeLogoFallback;
  }

  if (normalized.mode === "preset") {
    return resolveAssistantAvatarPresetUrl(normalized) ?? storeLogoFallback;
  }

  if (normalized.mode === "custom") {
    return resolveAssistantAvatarCustomUrl(normalized) ?? storeLogoFallback;
  }

  return storeLogoFallback;
}
