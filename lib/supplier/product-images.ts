import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadSupplierProductImage } from "@/lib/supplier/storage";
import {
  parseProductImagesFormPayload,
  type ProductEditImage,
} from "@/lib/products/product-gallery-types";

export const SUPPLIER_GALLERY_MAX_IMAGES = 10;

export type SupplierProductImage = {
  id: string;
  imageUrl: string;
  sortOrder: number;
  isPrimary: boolean;
};

function asAdmin(client: SupabaseClient) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return client as any;
}

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

const LIST_CHUNK_SIZE = 200;

export async function listSupplierProductImages(
  client: SupabaseClient,
  productIds: string[],
): Promise<Map<string, SupplierProductImage[]>> {
  const result = new Map<string, SupplierProductImage[]>();
  const uniqueIds = [...new Set(productIds.filter(Boolean))];
  if (uniqueIds.length === 0) return result;

  const grouped = new Map<string, Record<string, unknown>[]>();
  const admin = asAdmin(client);

  for (let offset = 0; offset < uniqueIds.length; offset += LIST_CHUNK_SIZE) {
    const chunk = uniqueIds.slice(offset, offset + LIST_CHUNK_SIZE);
    const { data, error } = await admin
      .from("supplier_product_images")
      .select("id, supplier_product_id, image_url, sort_order, is_primary")
      .in("supplier_product_id", chunk)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[supplier-product-images] list", error.message);
      continue;
    }

    for (const row of (data as Record<string, unknown>[] | null) ?? []) {
      const productId = String(row.supplier_product_id ?? "");
      if (!productId) continue;
      const list = grouped.get(productId) ?? [];
      list.push(row);
      grouped.set(productId, list);
    }
  }

  for (const [productId, rows] of grouped) {
    result.set(productId, mapSupplierProductImages(rows));
  }
  return result;
}

function getImageFilesFromFormData(formData: FormData): File[] {
  const fromGallery = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (fromGallery.length > 0) return fromGallery;

  const legacy = formData.get("image");
  if (legacy instanceof File && legacy.size > 0) return [legacy];
  return [];
}

async function syncCoverUrl(
  client: SupabaseClient,
  productId: string,
  coverUrl: string | null,
) {
  await asAdmin(client)
    .from("supplier_products")
    .update({
      image_url: coverUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);
}

/**
 * Reemplaza/ordena la galería según el payload del ProductGalleryField.
 * Devuelve la URL de portada (primera foto).
 */
export async function syncSupplierProductGalleryFromFormData(
  client: SupabaseClient,
  userId: string,
  productId: string,
  formData: FormData,
): Promise<{ error?: string; coverUrl: string | null; images: SupplierProductImage[] }> {
  const newFiles = getImageFilesFromFormData(formData);
  const payload = parseProductImagesFormPayload(formData.get("product_images_json"));
  const admin = asAdmin(client);

  if (!payload && newFiles.length === 0) {
    const { data } = await admin
      .from("supplier_product_images")
      .select("id, image_url, sort_order, is_primary")
      .eq("supplier_product_id", productId)
      .order("sort_order", { ascending: true });
    const images = mapSupplierProductImages(data as Record<string, unknown>[] | null);
    return {
      coverUrl: images[0]?.imageUrl ?? null,
      images,
    };
  }

  const keep = payload?.keep ?? [];
  const removedIds = payload?.removedIds ?? [];
  const finalCount = keep.length + newFiles.length;
  if (finalCount > SUPPLIER_GALLERY_MAX_IMAGES) {
    return {
      error: `Máximo ${SUPPLIER_GALLERY_MAX_IMAGES} fotos por producto.`,
      coverUrl: null,
      images: [],
    };
  }

  if (removedIds.length > 0) {
    const { error } = await admin
      .from("supplier_product_images")
      .delete()
      .eq("supplier_product_id", productId)
      .in("id", removedIds);
    if (error) {
      return { error: error.message, coverUrl: null, images: [] };
    }
  }

  // Índice único de portada: primero se apaga todo, luego se marca una sola fila.
  await admin
    .from("supplier_product_images")
    .update({ is_primary: false })
    .eq("supplier_product_id", productId);

  for (const item of keep) {
    const { error } = await admin
      .from("supplier_product_images")
      .update({
        sort_order: item.sortOrder,
        is_primary: false,
      })
      .eq("id", item.id)
      .eq("supplier_product_id", productId);
    if (error) {
      return { error: error.message, coverUrl: null, images: [] };
    }
  }

  const startSort =
    keep.length > 0
      ? Math.max(...keep.map((item) => item.sortOrder)) + 1
      : 0;

  for (const [index, file] of newFiles.entries()) {
    const uploaded = await uploadSupplierProductImage(client, userId, file);
    if (uploaded.error || !uploaded.publicUrl) {
      return {
        error: uploaded.error ?? "No se pudo subir la foto.",
        coverUrl: null,
        images: [],
      };
    }
    const { error } = await admin.from("supplier_product_images").insert({
      supplier_product_id: productId,
      image_url: uploaded.publicUrl,
      sort_order: startSort + index,
      is_primary: false,
    });
    if (error) {
      return { error: error.message, coverUrl: null, images: [] };
    }
  }

  const { data: rows, error: listError } = await admin
    .from("supplier_product_images")
    .select("id, image_url, sort_order, is_primary")
    .eq("supplier_product_id", productId)
    .order("sort_order", { ascending: true });

  if (listError) {
    return { error: listError.message, coverUrl: null, images: [] };
  }

  let images = mapSupplierProductImages(rows as Record<string, unknown>[] | null);
  if (images.length > 0) {
    const preferredId =
      keep.find((item) => item.isPrimary && images.some((image) => image.id === item.id))
        ?.id ?? images[0]!.id;
    await admin
      .from("supplier_product_images")
      .update({ is_primary: true })
      .eq("id", preferredId)
      .eq("supplier_product_id", productId);
    images = mapSupplierProductImages(
      images.map((image) => ({
        id: image.id,
        image_url: image.imageUrl,
        sort_order: image.sortOrder,
        is_primary: image.id === preferredId,
      })),
    );
  }

  const coverUrl = images[0]?.imageUrl ?? null;
  await syncCoverUrl(client, productId, coverUrl);
  return { coverUrl, images };
}
