import type { SupabaseClient } from "@supabase/supabase-js";
import {
  compressProductImage,
  formatFileSize,
  type ImageOptimizationResult,
} from "@/lib/image-compress";
import { PRODUCT_IMAGE_MAX_INPUT_BYTES, PRODUCT_IMAGE_MAX_OUTPUT_BYTES } from "@/lib/product-image";

export const PRODUCT_IMAGES_BUCKET = "product-images";
export const STORE_ASSETS_BUCKET = "store-assets";
export const STORE_LOGOS_BUCKET = "store-logos";

const MAX_INPUT_SIZE = PRODUCT_IMAGE_MAX_INPUT_BYTES;
const MAX_QR_INPUT_SIZE = 2 * 1024 * 1024; // 2 MB para QR

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export interface UploadProductImageResult {
  url?: string;
  error?: string;
  optimization?: ImageOptimizationResult;
}

export async function uploadProductImage(
  supabase: SupabaseClient,
  storeId: string,
  file: File,
): Promise<UploadProductImageResult> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Formato no permitido. Usa JPG, PNG, WebP o GIF." };
  }

  if (file.size > MAX_INPUT_SIZE) {
    return {
      error: `La imagen supera el límite de ${formatFileSize(MAX_INPUT_SIZE)}. Elige otra o recórtala antes de subir.`,
    };
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  let optimization: ImageOptimizationResult;
  try {
    optimization = await compressProductImage(inputBuffer);
  } catch (error) {
    if (error instanceof Error && error.message === "IMAGE_TOO_LARGE") {
      return {
        error: "No se pudo optimizar la imagen por debajo de 40 KB. Prueba con otra foto.",
      };
    }
    return { error: "No se pudo procesar la imagen. Prueba con otro archivo." };
  }

  if (optimization.compressedSize > PRODUCT_IMAGE_MAX_OUTPUT_BYTES) {
    return { error: "La imagen optimizada supera 40 KB. Prueba con otra foto." };
  }

  const path = `${storeId}/${crypto.randomUUID()}.webp`;

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, optimization.buffer, {
      cacheControl: "31536000",
      upsert: false,
      contentType: "image/webp",
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data } = supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(path);

  return {
    url: data.publicUrl,
    optimization,
  };
}

export interface UploadStoreAssetResult {
  url?: string;
  error?: string;
}

/** Sube imágenes de configuración (QR Pago Móvil, etc.) al bucket store-assets. */
export async function uploadStoreAssetImage(
  supabase: SupabaseClient,
  storeId: string,
  file: File,
  folder: string,
): Promise<UploadStoreAssetResult> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Formato no permitido. Usa JPG, PNG, WebP o GIF." };
  }

  if (file.size > MAX_QR_INPUT_SIZE) {
    return { error: "La imagen supera el límite de 2 MB." };
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  let optimization: ImageOptimizationResult;
  try {
    optimization = await compressProductImage(inputBuffer);
  } catch {
    return { error: "No se pudo procesar la imagen. Prueba con otro archivo." };
  }

  const safeFolder = folder.replace(/[^a-z0-9-]/gi, "");
  const path = `${storeId}/${safeFolder}/${crypto.randomUUID()}.webp`;

  const { error: uploadError } = await supabase.storage
    .from(STORE_ASSETS_BUCKET)
    .upload(path, optimization.buffer, {
      cacheControl: "31536000",
      upsert: false,
      contentType: "image/webp",
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data } = supabase.storage.from(STORE_ASSETS_BUCKET).getPublicUrl(path);

  return { url: data.publicUrl };
}

/** Sube el logo de la tienda al bucket store-logos. */
export async function uploadStoreLogoImage(
  supabase: SupabaseClient,
  storeId: string,
  file: File,
): Promise<UploadStoreAssetResult> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Formato no permitido. Usa JPG, PNG, WebP o GIF." };
  }

  if (file.size > MAX_QR_INPUT_SIZE) {
    return { error: "La imagen supera el límite de 2 MB." };
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  let optimization: ImageOptimizationResult;
  try {
    optimization = await compressProductImage(inputBuffer);
  } catch {
    return { error: "No se pudo procesar la imagen. Prueba con otro archivo." };
  }

  const path = `${storeId}/${crypto.randomUUID()}.webp`;

  const { error: uploadError } = await supabase.storage
    .from(STORE_LOGOS_BUCKET)
    .upload(path, optimization.buffer, {
      cacheControl: "31536000",
      upsert: false,
      contentType: "image/webp",
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data } = supabase.storage.from(STORE_LOGOS_BUCKET).getPublicUrl(path);

  return { url: data.publicUrl };
}

export function buildOptimizationMessage(
  optimization: ImageOptimizationResult,
): string {
  const saved =
    optimization.originalSize > 0
      ? Math.round(
          ((optimization.originalSize - optimization.compressedSize) /
            optimization.originalSize) *
            100,
        )
      : 0;

  return `Imagen optimizada para web: ${formatFileSize(optimization.originalSize)} → ${formatFileSize(optimization.compressedSize)} (WebP ${optimization.width}×${optimization.height}px${saved > 0 ? `, −${saved}%` : ""}).`;
}
