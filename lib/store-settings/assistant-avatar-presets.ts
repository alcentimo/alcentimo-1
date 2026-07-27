import type { StoreRubro } from "@/src/config/categories";
import { normalizeStoreRubro } from "@/src/config/categories";
import {
  ASSISTANT_AVATAR_PRESET_MANIFEST,
  ASSISTANT_AVATAR_RUBRO_LABELS,
  type AssistantAvatarAnimationKind,
  type AssistantAvatarPresetManifestEntry,
  type AssistantAvatarRubro,
} from "@/lib/store-settings/assistant-avatar-manifest";

export type { AssistantAvatarAnimationKind, AssistantAvatarRubro };

export interface AssistantAvatarPreset extends AssistantAvatarPresetManifestEntry {}

export const ASSISTANT_AVATAR_PRESETS: AssistantAvatarPreset[] =
  ASSISTANT_AVATAR_PRESET_MANIFEST;

const PRESET_BY_ID = new Map(
  ASSISTANT_AVATAR_PRESETS.map((preset) => [preset.id, preset]),
);

/** Mapeo de ids legacy a ids actuales por rubro. */
const LEGACY_PRESET_ID_MAP: Record<string, string> = {
  "tech-bot": "tecnologia-robbo",
  "tech-chip": "tecnologia-chipster",
  "tecnologia-bot": "tecnologia-robbo",
  "tecnologia-chip": "tecnologia-chipster",
  "tecnologia-drone": "tecnologia-drone",
  "tecnologia-headset": "tecnologia-vr-buddy",
  "tecnologia-android": "tecnologia-robbo",
  "anime-neo": "coleccionables-neo",
  "fashion-chic": "ropa-moda-chic",
  "food-chef": "alimentos-chef",
  "alimentos-baker": "alimentos-chef",
  "alimentos-farm": "alimentos-vaca",
  "alimentos-sushi": "alimentos-pizza",
  "alimentos-sweet": "alimentos-helado",
  "alimentos-grill": "alimentos-burger",
  "alimentos-harvest": "alimentos-cabra",
  "alimentos-spice": "alimentos-chef",
  "alimentos-fresh": "alimentos-palta",
  "wellness-leaf": "salud-belleza-leaf",
  "office-pen": "papeleria-libreria-oficina-pen",
  "collectibles-star": "coleccionables-hero",
  "collectibles-mask": "coleccionables-mask",
};

export function resolveAssistantAvatarPresetId(
  presetId: string | undefined,
): string | undefined {
  if (!presetId) return undefined;
  const trimmed = presetId.trim();
  if (PRESET_BY_ID.has(trimmed)) return trimmed;
  const mapped = LEGACY_PRESET_ID_MAP[trimmed];
  if (mapped && PRESET_BY_ID.has(mapped)) return mapped;
  return undefined;
}

export function getAssistantAvatarPreset(
  presetId: string,
): AssistantAvatarPreset | undefined {
  const resolvedId = resolveAssistantAvatarPresetId(presetId);
  return resolvedId ? PRESET_BY_ID.get(resolvedId) : undefined;
}

function normalizeRubro(storeRubro: string | null | undefined): StoreRubro {
  return normalizeStoreRubro(storeRubro ?? undefined);
}

export function getAssistantAvatarRubroLabel(rubro: StoreRubro): string {
  return ASSISTANT_AVATAR_RUBRO_LABELS[rubro];
}

export function getAssistantAvatarPresetsForRubro(
  storeRubro: string | null | undefined,
): AssistantAvatarPreset[] {
  const rubro = normalizeRubro(storeRubro);
  return ASSISTANT_AVATAR_PRESETS.filter((preset) => preset.rubro === rubro);
}

export interface AssistantAvatarGallerySections {
  rubro: StoreRubro;
  rubroLabel: string;
  rubroPresets: AssistantAvatarPreset[];
}

/** Galería estricta: solo personajes del rubro activo de la tienda. */
export function getAssistantAvatarGalleryForRubro(
  storeRubro: string | null | undefined,
): AssistantAvatarGallerySections {
  const rubro = normalizeRubro(storeRubro);

  return {
    rubro,
    rubroLabel: getAssistantAvatarRubroLabel(rubro),
    rubroPresets: getAssistantAvatarPresetsForRubro(rubro),
  };
}

export function getDefaultPresetForRubro(
  storeRubro: string | null | undefined,
): AssistantAvatarPreset | undefined {
  return getAssistantAvatarPresetsForRubro(storeRubro)[0];
}
