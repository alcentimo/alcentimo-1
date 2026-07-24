export interface ProductEditImage {
  id: string;
  thumbUrl: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductImageKeepItem {
  id: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductImagesFormPayload {
  keep: ProductImageKeepItem[];
  removedIds: string[];
}

export interface CatalogProductGalleryImage {
  id: string;
  thumb_url: string;
  medium_url?: string;
  full_url?: string;
  sort_order: number;
  is_primary: boolean;
}

export function parseProductImagesFormPayload(
  raw: unknown,
): ProductImagesFormPayload | null {
  if (typeof raw !== "string" || !raw.trim()) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ProductImagesFormPayload>;
    const keep = Array.isArray(parsed.keep)
      ? parsed.keep
          .filter(
            (item): item is ProductImageKeepItem =>
              typeof item === "object" &&
              item != null &&
              typeof item.id === "string" &&
              typeof item.sortOrder === "number" &&
              typeof item.isPrimary === "boolean",
          )
          .map((item) => ({
            id: item.id,
            sortOrder: item.sortOrder,
            isPrimary: item.isPrimary,
          }))
      : [];
    const removedIds = Array.isArray(parsed.removedIds)
      ? parsed.removedIds.filter((id): id is string => typeof id === "string")
      : [];

    return { keep, removedIds };
  } catch {
    return null;
  }
}

export function parseCatalogGalleryImages(
  raw: unknown,
): CatalogProductGalleryImage[] {
  if (!raw) return [];

  const items = Array.isArray(raw) ? raw : [];

  return items
    .filter(
      (item): item is CatalogProductGalleryImage =>
        typeof item === "object" &&
        item != null &&
        typeof (item as CatalogProductGalleryImage).id === "string" &&
        typeof (item as CatalogProductGalleryImage).thumb_url === "string",
    )
    .map((item) => ({
      id: item.id,
      thumb_url: item.thumb_url,
      sort_order: Number(item.sort_order) || 0,
      is_primary: Boolean(item.is_primary),
    }))
    .sort((a, b) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
      return a.sort_order - b.sort_order || a.id.localeCompare(b.id);
    });
}

export function resolveCatalogProductImages(product: {
  thumb_url?: string | null;
  gallery_images?: unknown;
}): CatalogProductGalleryImage[] {
  const gallery = parseCatalogGalleryImages(product.gallery_images);
  if (gallery.length > 0) return gallery;

  if (product.thumb_url) {
    return [
      {
        id: "primary",
        thumb_url: product.thumb_url,
        sort_order: 0,
        is_primary: true,
      },
    ];
  }

  return [];
}
