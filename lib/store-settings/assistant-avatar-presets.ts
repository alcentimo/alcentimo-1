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

/** Mapeo de ids legacy (v1) a ids actuales por rubro. */
const LEGACY_PRESET_ID_MAP: Record<string, string> = {
  "general-orbit": "general-orbit",
  "general-spark": "general-spark",
  "general-wave": "general-wave",
  "tech-bot": "tecnologia-bot",
  "tech-chip": "tecnologia-chip",
  "anime-neo": "coleccionables-neo",
  "anime-sakura": "coleccionables-sakura",
  "fashion-chic": "ropa-moda-chic",
  "fashion-glam": "ropa-moda-glam",
  "food-chef": "alimentos-chef",
  "food-fresh": "alimentos-fresh",
  "wellness-leaf": "salud-belleza-leaf",
  "wellness-glow": "salud-belleza-glow",
  "office-pen": "papeleria-libreria-oficina-pen",
  "office-note": "papeleria-libreria-oficina-note",
  "collectibles-star": "coleccionables-star",
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

function normalizeRubro(
  storeRubro: string | null | undefined,
): AssistantAvatarRubro | StoreRubro {
  const rubro = normalizeStoreRubro(storeRubro ?? undefined);
  if (rubro in ASSISTANT_AVATAR_RUBRO_LABELS) {
    return rubro as StoreRubro;
  }
  return "general";
}

export function getAssistantAvatarRubroLabel(
  rubro: AssistantAvatarRubro,
): string {
  return ASSISTANT_AVATAR_RUBRO_LABELS[rubro] ?? ASSISTANT_AVATAR_RUBRO_LABELS.general;
}

export function getAssistantAvatarPresetsForRubro(
  storeRubro: string | null | undefined,
): AssistantAvatarPreset[] {
  const rubro = normalizeRubro(storeRubro);
  return ASSISTANT_AVATAR_PRESETS.filter((preset) => preset.rubro === rubro);
}

export function getGeneralAssistantAvatarPresets(): AssistantAvatarPreset[] {
  return ASSISTANT_AVATAR_PRESETS.filter((preset) => preset.rubro === "general");
}

export interface AssistantAvatarGallerySections {
  rubro: AssistantAvatarRubro | StoreRubro;
  rubroLabel: string;
  generalPresets: AssistantAvatarPreset[];
  rubroPresets: AssistantAvatarPreset[];
}

/** Galería filtrada: solo general + rubro principal de la tienda. */
export function getAssistantAvatarGalleryForRubro(
  storeRubro: string | null | undefined,
): AssistantAvatarGallerySections {
  const rubro = normalizeRubro(storeRubro);

  return {
    rubro,
    rubroLabel: getAssistantAvatarRubroLabel(rubro),
    generalPresets: getGeneralAssistantAvatarPresets(),
    rubroPresets:
      rubro === "general"
        ? []
        : getAssistantAvatarPresetsForRubro(rubro),
  };
}

export function getDefaultPresetForRubro(
  storeRubro: string | null | undefined,
): AssistantAvatarPreset {
  const gallery = getAssistantAvatarGalleryForRubro(storeRubro);
  return gallery.rubroPresets[0] ?? gallery.generalPresets[0];
}
