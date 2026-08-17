import "server-only";

import type { CatalogListItem } from "@/lib/database.types";
import type { CatalogProductGalleryImage } from "@/lib/products/product-gallery-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { listSupplierProductImages } from "@/lib/supplier/product-images";
import { supplierImagesToCatalogGalleryImages } from "@/lib/supplier/product-gallery";

const LINK_CHUNK_SIZE = 200;

function pickGalleryImages(
  catalogImages: CatalogProductGalleryImage[],
  supplierImages: CatalogProductGalleryImage[] | undefined,
): CatalogProductGalleryImage[] {
  if (supplierImages && supplierImages.length > 0) return supplierImages;
  return catalogImages;
}

/**
 * Resuelve la galería mayorista (`supplier_product_images`) para productos de tienda
 * vinculados por dropship. Usa service role porque la tabla no es legible por anon.
 */
export async function resolveSupplierGalleryForProductIds(
  productIds: string[],
): Promise<Map<string, CatalogProductGalleryImage[]>> {
  const uniqueProductIds = [...new Set(productIds.filter(Boolean))];
  const result = new Map<string, CatalogProductGalleryImage[]>();
  if (uniqueProductIds.length === 0) return result;

  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = admin as any;
    const supplierIdByProductId = new Map<string, string>();

    for (
      let offset = 0;
      offset < uniqueProductIds.length;
      offset += LINK_CHUNK_SIZE
    ) {
      const chunk = uniqueProductIds.slice(offset, offset + LINK_CHUNK_SIZE);
      const { data, error } = await client
        .from("store_dropship_links")
        .select("product_id, supplier_product_id")
        .in("product_id", chunk);

      if (error) {
        console.warn("[resolve-supplier-gallery] links", error.message);
        continue;
      }

      for (const row of (data as Array<{
        product_id?: string;
        supplier_product_id?: string;
      }> | null) ?? []) {
        if (
          typeof row.product_id === "string" &&
          row.product_id &&
          typeof row.supplier_product_id === "string" &&
          row.supplier_product_id
        ) {
          supplierIdByProductId.set(row.product_id, row.supplier_product_id);
        }
      }
    }

    if (supplierIdByProductId.size === 0) return result;

    const supplierIds = [
      ...new Set(supplierIdByProductId.values()),
    ];
    const galleryBySupplierId = await listSupplierProductImages(admin, supplierIds);

    for (const [productId, supplierProductId] of supplierIdByProductId) {
      const supplierImages = galleryBySupplierId.get(supplierProductId);
      if (!supplierImages || supplierImages.length === 0) continue;
      result.set(
        productId,
        supplierImagesToCatalogGalleryImages(supplierImages),
      );
    }
  } catch (caught) {
    console.warn(
      "[resolve-supplier-gallery]",
      caught instanceof Error ? caught.message : caught,
    );
  }

  return result;
}

export async function resolveSupplierGalleryForProductId(
  productId: string,
): Promise<CatalogProductGalleryImage[]> {
  const galleries = await resolveSupplierGalleryForProductIds([productId]);
  return galleries.get(productId) ?? [];
}

export function applySupplierGalleryToCatalogItems(
  products: CatalogListItem[],
  supplierGalleryByProductId: Map<string, CatalogProductGalleryImage[]>,
): CatalogListItem[] {
  if (supplierGalleryByProductId.size === 0) return products;

  return products.map((product) => {
    const supplierGallery = supplierGalleryByProductId.get(product.product_id);
    const galleryImages = pickGalleryImages(
      product.gallery_images ?? [],
      supplierGallery,
    );
    if (galleryImages.length === 0) return product;

    const primary =
      galleryImages.find((image) => image.is_primary) ?? galleryImages[0];

    return {
      ...product,
      gallery_images: galleryImages,
      thumb_url: primary?.thumb_url ?? product.thumb_url,
    };
  });
}

export { pickGalleryImages };
