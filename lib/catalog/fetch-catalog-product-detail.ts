"use server";

import { getSupabaseAnonClient } from "@/lib/supabase";
import type { CatalogProductGalleryImage } from "@/lib/products/product-gallery-types";

export interface CatalogProductDetailExtra {
  description: string | null;
  images: CatalogProductGalleryImage[];
}

interface CatalogProductDetailRow {
  description: string | null;
  images: unknown;
}

export async function fetchCatalogProductDetail(
  storeSlug: string,
  productSlug: string,
): Promise<{ detail?: CatalogProductDetailExtra; error?: string }> {
  const normalizedStore = storeSlug.trim().toLowerCase();
  const normalizedProduct = productSlug.trim().toLowerCase();

  if (!normalizedStore || !normalizedProduct) {
    return { error: "Producto no válido." };
  }

  const supabase = getSupabaseAnonClient();
  const { data, error } = await supabase
    .from("catalog_product_detail_view")
    .select("description, images")
    .eq("store_slug", normalizedStore)
    .eq("slug", normalizedProduct)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!data) {
    return { error: "Producto no encontrado." };
  }

  const row = data as unknown as CatalogProductDetailRow;
  const rawImages = Array.isArray(row.images) ? row.images : [];
  const images: CatalogProductGalleryImage[] = rawImages
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item != null,
    )
    .map((item, index) => ({
      id: String(item.id ?? index),
      thumb_url: String(item.thumb_url ?? item.medium_url ?? ""),
      medium_url:
        typeof item.medium_url === "string" ? item.medium_url : undefined,
      full_url: typeof item.full_url === "string" ? item.full_url : undefined,
      sort_order: Number(item.sort_order) || index,
      is_primary: Boolean(item.is_primary),
    }))
    .filter((item) => item.thumb_url.length > 0)
    .sort((a, b) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
      return a.sort_order - b.sort_order || a.id.localeCompare(b.id);
    });

  return {
    detail: {
      description:
        typeof row.description === "string" ? row.description.trim() : null,
      images,
    },
  };
}
