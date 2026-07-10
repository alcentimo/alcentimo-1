import type { SupabaseClient } from "@supabase/supabase-js";
import {
  compressProductImage,
  formatFileSize,
  type ImageOptimizationResult,
} from "@/lib/image-compress";

export const PRODUCT_IMAGES_BUCKET = "product-images";

const MAX_INPUT_SIZE = 5 * 1024 * 1024; // 5 MB (entrada del usuario)

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
    return { error: "La imagen supera el límite de 5 MB." };
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
