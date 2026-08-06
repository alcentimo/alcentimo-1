import type { AssistantAvatarAnimationKind } from "@/lib/store-settings/assistant-avatar-presets";
import type { CatalogAssistantAvatarSettings } from "@/lib/store-settings/types";

export interface StorefrontAssistantAvatarContext {
  url: string | null;
  presetId: string | null;
  animation: AssistantAvatarAnimationKind | null;
  animated: boolean;
}

/**
 * Avatar del asistente en el catálogo público: siempre el logo de la tienda
 * (Identidad). Se ignora cualquier configuración legacy de avatar personalizado.
 */
export function resolveStorefrontAssistantAvatar(
  _settings: CatalogAssistantAvatarSettings | undefined,
  storeLogoFallback: string | null,
): StorefrontAssistantAvatarContext {
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
