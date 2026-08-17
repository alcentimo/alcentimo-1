import type { ProductEditImage } from "@/lib/products/product-gallery-types";

/** Límite de fotos por producto en el hub de proveedores (client-safe). */
export const SUPPLIER_GALLERY_MAX_IMAGES = 10;

export type SupplierProductImage = {
  id: string;
  imageUrl: string;
  sortOrder: number;
  isPrimary: boolean;
};

export function mapSupplierProductImages(
  rows: Record<string, unknown>[] | null | undefined,
): SupplierProductImage[] {
  return (rows ?? [])
    .map((row) => ({
      id: String(row.id),
      imageUrl:
        typeof row.image_url === "string" && row.image_url.trim()
          ? row.image_url.trim()
          : "",
      sortOrder: Number(row.sort_order) || 0,
      isPrimary: Boolean(row.is_primary),
    }))
    .filter((row) => row.id && row.imageUrl)
    .sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return a.sortOrder - b.sortOrder || a.id.localeCompare(b.id);
    });
}

export function supplierImagesToEditImages(
  images: SupplierProductImage[],
): ProductEditImage[] {
  return images.map((image, index) => ({
    id: image.id,
    thumbUrl: image.imageUrl,
    sortOrder: index,
    isPrimary: index === 0,
  }));
}

export function supplierImageUrls(
  images: SupplierProductImage[],
  fallbackUrl?: string | null,
): string[] {
  if (images.length > 0) return images.map((image) => image.imageUrl);
  const fallback = fallbackUrl?.trim();
  return fallback ? [fallback] : [];
}
