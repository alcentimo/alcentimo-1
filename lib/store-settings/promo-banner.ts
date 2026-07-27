import type {
  CatalogPromoBannerSettings,
  CatalogPromoBannerSlide,
} from "@/lib/store-settings/types";

export const MAX_PROMO_BANNER_SLIDES = 6;

export function defaultPromoBannerSettings(): CatalogPromoBannerSettings {
  return {
    enabled: false,
    slides: [],
  };
}

function isSafeBannerLink(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  return trimmed.startsWith("https://");
}

function normalizeDraftSlide(raw: unknown): CatalogPromoBannerSlide | null {
  if (!raw || typeof raw !== "object") return null;

  const slide = raw as Record<string, unknown>;
  const mobileImageUrl =
    typeof slide.mobileImageUrl === "string" ? slide.mobileImageUrl.trim() : "";
  const desktopImageUrl =
    typeof slide.desktopImageUrl === "string"
      ? slide.desktopImageUrl.trim()
      : "";
  const alt =
    typeof slide.alt === "string" ? slide.alt.trim().slice(0, 120) : undefined;
  const linkUrl =
    typeof slide.linkUrl === "string" && isSafeBannerLink(slide.linkUrl)
      ? slide.linkUrl.trim()
      : undefined;
  const id =
    typeof slide.id === "string" && slide.id.trim()
      ? slide.id.trim()
      : createPromoBannerSlideId();

  return {
    id,
    mobileImageUrl,
    ...(desktopImageUrl ? { desktopImageUrl } : {}),
    ...(alt ? { alt } : {}),
    ...(linkUrl ? { linkUrl } : {}),
  };
}

/** Conserva slides en edición aunque aún no tengan imagen (UI de administración). */
export function normalizePromoBannerDraft(
  raw: unknown,
): CatalogPromoBannerSettings {
  if (!raw || typeof raw !== "object") {
    return defaultPromoBannerSettings();
  }

  const value = raw as Record<string, unknown>;
  const slides = Array.isArray(value.slides)
    ? value.slides
        .map(normalizeDraftSlide)
        .filter((slide): slide is CatalogPromoBannerSlide => slide !== null)
        .slice(0, MAX_PROMO_BANNER_SLIDES)
    : [];

  return {
    enabled: value.enabled === true,
    slides,
  };
}

function normalizeSlide(raw: unknown): CatalogPromoBannerSlide | null {
  if (!raw || typeof raw !== "object") return null;

  const slide = raw as Record<string, unknown>;
  const mobileImageUrl =
    typeof slide.mobileImageUrl === "string" ? slide.mobileImageUrl.trim() : "";

  if (!mobileImageUrl.startsWith("http://") && !mobileImageUrl.startsWith("https://")) {
    return null;
  }

  const desktopImageUrl =
    typeof slide.desktopImageUrl === "string"
      ? slide.desktopImageUrl.trim()
      : "";
  const alt =
    typeof slide.alt === "string" ? slide.alt.trim().slice(0, 120) : undefined;
  const linkUrl =
    typeof slide.linkUrl === "string" && isSafeBannerLink(slide.linkUrl)
      ? slide.linkUrl.trim()
      : undefined;
  const id =
    typeof slide.id === "string" && slide.id.trim()
      ? slide.id.trim()
      : `slide-${mobileImageUrl.slice(-12)}`;

  return {
    id,
    mobileImageUrl,
    ...(desktopImageUrl.startsWith("http")
      ? { desktopImageUrl }
      : {}),
    ...(alt ? { alt } : {}),
    ...(linkUrl ? { linkUrl } : {}),
  };
}

export function normalizePromoBannerSettings(
  raw: unknown,
): CatalogPromoBannerSettings {
  if (!raw || typeof raw !== "object") {
    return defaultPromoBannerSettings();
  }

  const value = raw as Record<string, unknown>;
  const slides = Array.isArray(value.slides)
    ? value.slides
        .map(normalizeSlide)
        .filter((slide): slide is CatalogPromoBannerSlide => slide !== null)
        .slice(0, MAX_PROMO_BANNER_SLIDES)
    : [];

  return {
    enabled: value.enabled === true,
    slides,
  };
}

export function getActivePromoBannerSlides(
  settings?: CatalogPromoBannerSettings | null,
): CatalogPromoBannerSlide[] {
  if (!settings?.enabled) return [];
  return settings.slides.filter((slide) => slide.mobileImageUrl.trim());
}

export function resolvePromoBannerSettings(
  settings?: CatalogPromoBannerSettings | null,
): CatalogPromoBannerSettings {
  return normalizePromoBannerSettings(settings ?? defaultPromoBannerSettings());
}

export function sanitizePromoBannerForStorage(
  settings?: CatalogPromoBannerSettings | null,
): CatalogPromoBannerSettings {
  return normalizePromoBannerSettings(settings ?? defaultPromoBannerSettings());
}

export function createPromoBannerSlideId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `slide-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
