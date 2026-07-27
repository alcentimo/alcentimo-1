import { getAssistantAvatarPreset } from "@/lib/store-settings/assistant-avatar-presets";
import type { CatalogAssistantAvatarSettings } from "@/lib/store-settings/types";

export function defaultAssistantAvatarSettings(): CatalogAssistantAvatarSettings {
  return { mode: "store-logo" };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeAssistantAvatarSettings(
  raw: unknown,
): CatalogAssistantAvatarSettings {
  const defaults = defaultAssistantAvatarSettings();

  if (typeof raw !== "object" || raw === null) {
    return defaults;
  }

  const record = raw as Record<string, unknown>;
  const mode =
    record.mode === "store-logo" ||
    record.mode === "preset" ||
    record.mode === "custom"
      ? record.mode
      : defaults.mode;

  if (mode === "preset") {
    const presetId =
      typeof record.presetId === "string" ? record.presetId.trim() : "";
    if (presetId && getAssistantAvatarPreset(presetId)) {
      return { mode, presetId };
    }
    return defaults;
  }

  if (mode === "custom") {
    const customImageUrl =
      typeof record.customImageUrl === "string"
        ? record.customImageUrl.trim()
        : "";
    if (customImageUrl && isHttpUrl(customImageUrl)) {
      return { mode, customImageUrl };
    }
    return defaults;
  }

  return { mode: "store-logo" };
}

export function sanitizeAssistantAvatarForStorage(
  raw: CatalogAssistantAvatarSettings | undefined,
): CatalogAssistantAvatarSettings {
  return normalizeAssistantAvatarSettings(raw);
}

export function resolveAssistantAvatarPresetUrl(
  settings: CatalogAssistantAvatarSettings | undefined,
): string | null {
  const normalized = normalizeAssistantAvatarSettings(settings);
  if (normalized.mode !== "preset" || !normalized.presetId) {
    return null;
  }

  const preset = getAssistantAvatarPreset(normalized.presetId);
  return preset?.imagePath ?? null;
}

export function resolveAssistantAvatarCustomUrl(
  settings: CatalogAssistantAvatarSettings | undefined,
): string | null {
  const normalized = normalizeAssistantAvatarSettings(settings);
  if (normalized.mode !== "custom" || !normalized.customImageUrl) {
    return null;
  }

  return normalized.customImageUrl;
}
