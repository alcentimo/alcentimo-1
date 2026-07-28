import { getStoreCatalogBasePath } from "@/lib/store-host";
import type {
  CatalogPromoBannerSettings,
  CatalogPromoBannerSlide,
} from "@/lib/store-settings/types";

export const MAX_PROMO_BANNER_SLIDES = 5;

const PRODUCT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function defaultPromoBannerSettings(): CatalogPromoBannerSettings {
  return {
    enabled: false,
    slides: [],
  };
}

export function isValidPromoBannerProductId(value: unknown): value is string {
  return typeof value === "string" && PRODUCT_ID_RE.test(value.trim());
}

export function isSafeBannerLink(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  return trimmed.startsWith("https://");
}

/** Ruta relativa del catálogo que abre la ficha de un producto (`?product=`). */
export function buildPromoBannerProductHref(
  storeSlug: string,
  productId: string,
): string {
  const base = getStoreCatalogBasePath(storeSlug);
  const query = `product=${encodeURIComponent(productId.trim())}`;
  if (base === "/") return `/?${query}`;
  return `${base}?${query}`;
}

function normalizeProductId(value: unknown): string | undefined {
  if (!isValidPromoBannerProductId(value)) return undefined;
  return value.trim().toLowerCase();
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
  const productId = normalizeProductId(slide.productId);
  const rawLink =
    typeof slide.linkUrl === "string" ? slide.linkUrl.trim() : "";
  const linkUrl =
    !productId && rawLink && isSafeBannerLink(rawLink) ? rawLink : undefined;
  const id =
    typeof slide.id === "string" && slide.id.trim()
      ? slide.id.trim()
      : createPromoBannerSlideId();

  return {
    id,
    mobileImageUrl,
    ...(desktopImageUrl ? { desktopImageUrl } : {}),
    ...(alt ? { alt } : {}),
    ...(productId ? { productId } : {}),
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

function normalizeSlide(
  raw: unknown,
  storeSlug?: string,
): CatalogPromoBannerSlide | null {
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
  const productId = normalizeProductId(slide.productId);
  const rawLink =
    typeof slide.linkUrl === "string" ? slide.linkUrl.trim() : "";
  const linkUrl = productId
    ? storeSlug
      ? buildPromoBannerProductHref(storeSlug, productId)
      : rawLink && isSafeBannerLink(rawLink)
        ? rawLink
        : undefined
    : rawLink && isSafeBannerLink(rawLink)
      ? rawLink
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
    ...(productId ? { productId } : {}),
    ...(linkUrl ? { linkUrl } : {}),
  };
}

export function normalizePromoBannerSettings(
  raw: unknown,
  storeSlug?: string,
): CatalogPromoBannerSettings {
  if (!raw || typeof raw !== "object") {
    return defaultPromoBannerSettings();
  }

  const value = raw as Record<string, unknown>;
  const slides = Array.isArray(value.slides)
    ? value.slides
        .map((slide) => normalizeSlide(slide, storeSlug))
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
  storeSlug?: string,
): CatalogPromoBannerSettings {
  return normalizePromoBannerSettings(
    settings ?? defaultPromoBannerSettings(),
    storeSlug,
  );
}

export function sanitizePromoBannerForStorage(
  settings?: CatalogPromoBannerSettings | null,
  storeSlug?: string,
): CatalogPromoBannerSettings {
  return normalizePromoBannerSettings(
    settings ?? defaultPromoBannerSettings(),
    storeSlug,
  );
}

export function createPromoBannerSlideId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `slide-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
