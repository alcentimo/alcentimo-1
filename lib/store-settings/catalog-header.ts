import {
  getAccessibleForeground,
  normalizeHex6,
} from "@/lib/store-settings/color-contrast";
import type { CatalogHeaderSettings } from "@/lib/store-settings/types";

export const CATALOG_HEADER_BG_MODES = ["theme", "brand", "solid"] as const;
export const CATALOG_HEADER_ALIGNMENTS = ["split", "stacked"] as const;

export function defaultCatalogHeaderSettings(): CatalogHeaderSettings {
  return {
    bgMode: "theme",
    alignment: "split",
  };
}

function normalizeCoverImageUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return undefined;
  }
  return trimmed;
}

/** Conserva borradores en el panel aunque la URL aún no sea http. */
export function normalizeCatalogHeaderDraft(
  raw: unknown,
): CatalogHeaderSettings {
  if (!raw || typeof raw !== "object") {
    return defaultCatalogHeaderSettings();
  }

  const value = raw as Record<string, unknown>;
  const bgMode =
    value.bgMode === "brand" || value.bgMode === "solid" || value.bgMode === "theme"
      ? value.bgMode
      : "theme";
  const alignment = value.alignment === "stacked" ? "stacked" : "split";
  const bgColor =
    typeof value.bgColor === "string"
      ? normalizeHex6(value.bgColor) ?? undefined
      : undefined;
  const coverImageUrl =
    typeof value.coverImageUrl === "string" && value.coverImageUrl.trim()
      ? value.coverImageUrl.trim()
      : undefined;

  return {
    bgMode,
    alignment,
    ...(bgColor ? { bgColor } : {}),
    ...(coverImageUrl ? { coverImageUrl } : {}),
  };
}

/** Persistencia pública: solo URLs http(s) y hex válidos. */
export function normalizeCatalogHeaderSettings(
  raw: unknown,
): CatalogHeaderSettings {
  const draft = normalizeCatalogHeaderDraft(raw);
  const coverImageUrl = normalizeCoverImageUrl(draft.coverImageUrl);
  const bgColor =
    draft.bgMode === "solid" ? normalizeHex6(draft.bgColor ?? "") ?? undefined : undefined;

  return {
    bgMode: draft.bgMode,
    alignment: draft.alignment,
    ...(bgColor ? { bgColor } : {}),
    ...(coverImageUrl ? { coverImageUrl } : {}),
  };
}

export function sanitizeCatalogHeaderForStorage(
  raw: unknown,
): CatalogHeaderSettings {
  return normalizeCatalogHeaderSettings(raw);
}

export function resolveCatalogHeaderBackground(
  header: CatalogHeaderSettings,
  brandPrimary: string,
  themeHeaderBg?: string,
): { background: string; foreground: string | null; isCustom: boolean } {
  if (header.bgMode === "brand") {
    const background = normalizeHex6(brandPrimary) ?? brandPrimary;
    return {
      background,
      foreground: getAccessibleForeground(background),
      isCustom: true,
    };
  }

  if (header.bgMode === "solid") {
    const background =
      normalizeHex6(header.bgColor ?? "") ??
      normalizeHex6(brandPrimary) ??
      "#ffffff";
    return {
      background,
      foreground: getAccessibleForeground(background),
      isCustom: true,
    };
  }

  return {
    background: themeHeaderBg ?? "transparent",
    foreground: null,
    isCustom: false,
  };
}

export function catalogHeaderSummary(header: CatalogHeaderSettings): string {
  return header.coverImageUrl?.startsWith("http")
    ? "Portada cargada"
    : "Sin portada";
}
