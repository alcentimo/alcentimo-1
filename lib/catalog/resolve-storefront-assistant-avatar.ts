import {
  normalizeAssistantAvatarSettings,
  resolveAssistantAvatarCustomUrl,
  resolveAssistantAvatarPresetUrl,
} from "@/lib/store-settings/assistant-avatar";
import {
  getAssistantAvatarPreset,
  type AssistantAvatarAnimationKind,
} from "@/lib/store-settings/assistant-avatar-presets";
import type { CatalogAssistantAvatarSettings } from "@/lib/store-settings/types";

export interface StorefrontAssistantAvatarContext {
  url: string | null;
  presetId: string | null;
  animation: AssistantAvatarAnimationKind | null;
  animated: boolean;
}

/**
 * Resuelve avatar del asistente para el catálogo público.
 * `storeLogoFallback` incluye logo de tienda, foto del comerciante o icono PWA.
 */
export function resolveStorefrontAssistantAvatar(
  settings: CatalogAssistantAvatarSettings | undefined,
  storeLogoFallback: string | null,
): StorefrontAssistantAvatarContext {
  const normalized = normalizeAssistantAvatarSettings(settings);

  if (normalized.mode === "store-logo") {
    return {
      url: storeLogoFallback,
      presetId: null,
      animation: null,
      animated: false,
    };
  }

  if (normalized.mode === "preset") {
    const preset = normalized.presetId
      ? getAssistantAvatarPreset(normalized.presetId)
      : undefined;

    return {
      url: preset?.imagePath ?? storeLogoFallback,
      presetId: preset?.id ?? null,
      animation: preset?.animation ?? null,
      animated: Boolean(preset),
    };
  }

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
