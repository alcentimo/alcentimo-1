import {
  normalizeAssistantAvatarSettings,
  resolveAssistantAvatarCustomUrl,
} from "@/lib/store-settings/assistant-avatar";
import type { AssistantAvatarAnimationKind } from "@/lib/store-settings/assistant-avatar-presets";
import type { CatalogAssistantAvatarSettings } from "@/lib/store-settings/types";

export interface StorefrontAssistantAvatarContext {
  url: string | null;
  presetId: string | null;
  animation: AssistantAvatarAnimationKind | null;
  animated: boolean;
}

/**
 * Resuelve avatar del asistente para el catálogo público.
 * Solo logo de tienda o imagen personalizada (los presets se migran a logo).
 */
export function resolveStorefrontAssistantAvatar(
  settings: CatalogAssistantAvatarSettings | undefined,
  storeLogoFallback: string | null,
): StorefrontAssistantAvatarContext {
  const normalized = normalizeAssistantAvatarSettings(settings);

  if (normalized.mode === "custom") {
    return {
      url: resolveAssistantAvatarCustomUrl(normalized) ?? storeLogoFallback,
      presetId: null,
      animation: null,
      animated: false,
    };
  }

  return {
    url: storeLogoFallback,
    presetId: null,
    animation: null,
    animated: false,
  };
}

/** @deprecated Usa resolveStorefrontAssistantAvatar().url */
export function resolveStorefrontAssistantAvatarUrl(
  settings: CatalogAssistantAvatarSettings | undefined,
  storeLogoFallback: string | null,
): string | null {
  return resolveStorefrontAssistantAvatar(settings, storeLogoFallback).url;
}
