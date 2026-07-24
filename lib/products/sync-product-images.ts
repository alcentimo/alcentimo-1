import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadProductImage } from "@/lib/storage";
import {
  parseProductImagesFormPayload,
  type ProductImagesFormPayload,
} from "@/lib/products/product-gallery-types";

const PRODUCT_IMAGES_BUCKET = "product-images";

function getImageFilesFromFormData(formData: FormData): File[] {
  const fromGallery = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (fromGallery.length > 0) return fromGallery;

  const legacy = formData.get("image");
  if (legacy instanceof File && legacy.size > 0) return [legacy];

  return [];
}

function extractStoragePathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}

async function deleteProductImageFromStorage(
  supabase: SupabaseClient,
  url: string,
): Promise<void> {
  const path = extractStoragePathFromPublicUrl(url);
  if (!path) return;
  await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
}

async function insertUploadedImage(
  supabase: SupabaseClient,
  productId: string,
  uploaded: Awaited<ReturnType<typeof uploadProductImage>>,
  file: File,
  altText: string,
  sortOrder: number,
  isPrimary: boolean,
): Promise<{ error?: string }> {
  if (uploaded.error || !uploaded.url) {
    return { error: uploaded.error ?? "No se pudo subir la imagen." };
  }

  const optimization = uploaded.optimization;
  const { error } = await supabase.from("product_images").insert({
    product_id: productId,
    thumb_url: uploaded.url,
    medium_url: uploaded.url,
    full_url: uploaded.url,
    is_primary: isPrimary,
    sort_order: sortOrder,
    alt_text: altText,
    mime_type: "image/webp",
    byte_size: optimization?.compressedSize ?? file.size,
    width: optimization?.width ?? null,
    height: optimization?.height ?? null,
  });

  if (error) return { error: error.message };
  return {};
}

export async function createProductImagesFromFormData(
  supabase: SupabaseClient,
  storeId: string,
  productId: string,
  formData: FormData,
  altText: string,
): Promise<{ error?: string; uploadedCount: number }> {
  const files = getImageFilesFromFormData(formData);
  if (files.length === 0) {
    return { error: "Sube al menos una foto del producto.", uploadedCount: 0 };
  }

  for (let index = 0; index < files.length; index++) {
    const file = files[index]!;
    const uploaded = await uploadProductImage(supabase, storeId, file);
    const inserted = await insertUploadedImage(
      supabase,
      productId,
      uploaded,
      file,
      altText,
      index,
      index === 0,
    );
    if (inserted.error) return { error: inserted.error, uploadedCount: index };
  }

  return { uploadedCount: files.length };
}

async function fetchProductImageUrls(
  supabase: SupabaseClient,
  productId: string,
  imageIds: string[],
): Promise<Map<string, string>> {
  if (imageIds.length === 0) return new Map();

  const { data } = await supabase
    .from("product_images")
    .select("id, thumb_url")
    .eq("product_id", productId)
    .in("id", imageIds);

  return new Map((data ?? []).map((row) => [row.id as string, row.thumb_url as string]));
}

async function applyExistingImageUpdates(
  supabase: SupabaseClient,
  productId: string,
  payload: ProductImagesFormPayload,
): Promise<{ error?: string }> {
  if (payload.removedIds.length > 0) {
    const urlsById = await fetchProductImageUrls(
      supabase,
      productId,
      payload.removedIds,
    );

    const { error: deleteError } = await supabase
      .from("product_images")
      .delete()
      .eq("product_id", productId)
      .in("id", payload.removedIds);

    if (deleteError) return { error: deleteError.message };

    await Promise.all(
      payload.removedIds.map(async (id) => {
        const url = urlsById.get(id);
        if (url) await deleteProductImageFromStorage(supabase, url);
      }),
    );
  }

  for (const item of payload.keep) {
    const { error } = await supabase
      .from("product_images")
      .update({
        sort_order: item.sortOrder,
        is_primary: item.isPrimary,
      })
      .eq("id", item.id)
      .eq("product_id", productId);

    if (error) return { error: error.message };
  }

  return {};
}

export async function syncProductImagesFromFormData(
  supabase: SupabaseClient,
  storeId: string,
  productId: string,
  formData: FormData,
  altText: string,
): Promise<{ error?: string; uploadedCount: number; changed: boolean }> {
  const newFiles = getImageFilesFromFormData(formData);
  const payload = parseProductImagesFormPayload(formData.get("product_images_json"));

  if (!payload && newFiles.length === 0) {
    return { uploadedCount: 0, changed: false };
  }

  if (payload) {
    const updateResult = await applyExistingImageUpdates(supabase, productId, payload);
    if (updateResult.error) {
      return { error: updateResult.error, uploadedCount: 0, changed: false };
    }
  } else if (newFiles.length === 1 && formData.get("image") instanceof File) {
    const { data: existingRows } = await supabase
      .from("product_images")
      .select("id, thumb_url")
      .eq("product_id", productId);

    if (existingRows && existingRows.length > 0) {
      await supabase.from("product_images").delete().eq("product_id", productId);
      await Promise.all(
        existingRows.map(async (row) => {
          if (row.thumb_url) {
            await deleteProductImageFromStorage(supabase, row.thumb_url as string);
          }
        }),
      );
    }
  }

  let uploadedCount = 0;
  if (newFiles.length > 0) {
    const { count: existingCount } = await supabase
      .from("product_images")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId);

    const startSortOrder = existingCount ?? 0;
    const hasPrimary =
      payload?.keep.some((item) => item.isPrimary) ?? (existingCount ?? 0) > 0;

    for (let index = 0; index < newFiles.length; index++) {
      const file = newFiles[index]!;
      const uploaded = await uploadProductImage(supabase, storeId, file);
      const inserted = await insertUploadedImage(
        supabase,
        productId,
        uploaded,
        file,
        altText,
        startSortOrder + index,
        !hasPrimary && index === 0,
      );
      if (inserted.error) {
        return { error: inserted.error, uploadedCount, changed: uploadedCount > 0 };
      }
      uploadedCount += 1;
    }
  }

  const { data: primaryRows, error: primaryLookupError } = await supabase
    .from("product_images")
    .select("id")
    .eq("product_id", productId)
    .eq("is_primary", true);

  if (primaryLookupError) {
    return { error: primaryLookupError.message, uploadedCount, changed: true };
  }

  if ((primaryRows ?? []).length === 0) {
    const { data: firstImage } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (firstImage?.id) {
      await supabase
        .from("product_images")
        .update({ is_primary: true })
        .eq("id", firstImage.id);
    }
  } else if ((primaryRows ?? []).length > 1) {
    const keepPrimaryId = primaryRows![0]!.id as string;
    await supabase
      .from("product_images")
      .update({ is_primary: false })
      .eq("product_id", productId)
      .neq("id", keepPrimaryId);
  }

  return {
    uploadedCount,
    changed: uploadedCount > 0 || Boolean(payload),
  };
}
