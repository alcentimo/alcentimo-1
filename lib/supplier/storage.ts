import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { formatFileSize } from "@/lib/format-file-size";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/storage-buckets";
import { PRODUCT_IMAGE_MAX_INPUT_BYTES } from "@/lib/product-image";
import {
  SOCIAL_PRODUCT_IMAGE_FILE_SUFFIX,
  buildSupplierOptimizationMessage,
  optimizeSupplierProductImage,
} from "@/lib/supplier/social-image";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type UploadSupplierProductImageResult = {
  publicUrl?: string;
  socialPublicUrl?: string;
  message?: string;
  error?: string;
};

/**
 * Sube la foto del producto de proveedor bajo `supplier/{userId}/…`
 * generando:
 * - WebP de catálogo (vitrina / web)
 * - JPEG cuadrado 1080×1080 listo para Instagram, Facebook y WhatsApp
 */
export async function uploadSupplierProductImage(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<UploadSupplierProductImageResult> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Formato no permitido. Usa JPG, PNG, WebP o GIF." };
  }

  if (file.size > PRODUCT_IMAGE_MAX_INPUT_BYTES) {
    return {
      error: `La imagen supera el límite de ${formatFileSize(PRODUCT_IMAGE_MAX_INPUT_BYTES)}. Elige otra o recórtala antes de subir.`,
    };
  }

  const safeUserId =
    userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "anon";
  const inputBuffer = Buffer.from(await file.arrayBuffer());

  let optimized;
  try {
    optimized = await optimizeSupplierProductImage(inputBuffer);
  } catch (error) {
    if (error instanceof Error && error.message === "IMAGE_TOO_LARGE") {
      return {
        error:
          "No se pudo optimizar la foto para catálogo y redes. Prueba con otra imagen.",
      };
    }
    return { error: "No se pudo procesar la imagen. Prueba con otro archivo." };
  }

  const id = crypto.randomUUID();
  const catalogPath = `supplier/${safeUserId}/${id}.webp`;
  const socialPath = `supplier/${safeUserId}/${id}${SOCIAL_PRODUCT_IMAGE_FILE_SUFFIX}`;

  const { error: catalogUploadError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(catalogPath, optimized.catalog.buffer, {
      cacheControl: "31536000",
      upsert: false,
      contentType: optimized.catalog.contentType,
    });

  if (catalogUploadError) {
    return { error: catalogUploadError.message };
  }

  const { error: socialUploadError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(socialPath, optimized.social.buffer, {
      cacheControl: "31536000",
      upsert: false,
      contentType: optimized.social.contentType,
    });

  if (socialUploadError) {
    // Catálogo ya subido: no fallar el producto; el download podrá regenerar.
    console.warn(
      "[supplier-social-upload]",
      socialUploadError.message,
    );
  }

  const { data: catalogData } = supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(catalogPath);
  const { data: socialData } = supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(socialPath);

  return {
    publicUrl: catalogData.publicUrl,
    socialPublicUrl: socialUploadError ? undefined : socialData.publicUrl,
    message: buildSupplierOptimizationMessage(optimized),
  };
}
