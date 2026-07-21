import type { SupabaseClient } from "@supabase/supabase-js";
import {
  compressProductImage,
  formatFileSize,
  type ImageOptimizationResult,
} from "@/lib/image-compress";
import { PRODUCT_IMAGE_MAX_INPUT_BYTES, PRODUCT_IMAGE_MAX_OUTPUT_BYTES } from "@/lib/product-image";
import { processStoreLogoFile } from "@/lib/store-logo/process-logo";
import { processPlatformLogoFile } from "@/lib/platform/process-platform-logo";

export const PRODUCT_IMAGES_BUCKET = "product-images";
export const STORE_ASSETS_BUCKET = "store-assets";
export const STORE_LOGOS_BUCKET = "store-logos";
export const PLATFORM_ASSETS_BUCKET = "platform-assets";

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
        error: "No se pudo optimizar la imagen por debajo de 120 KB. Prueba con otra foto.",
      };
    }
    return { error: "No se pudo procesar la imagen. Prueba con otro archivo." };
  }

  if (optimization.compressedSize > PRODUCT_IMAGE_MAX_OUTPUT_BYTES) {
    return { error: "La imagen optimizada supera 120 KB. Prueba con otra foto." };
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

export interface UploadStoreLogoResult {
  url?: string;
  pwaIcon192Url?: string;
  pwaIcon512Url?: string;
  warning?: string;
  error?: string;
}

function getStoreLogoStoragePaths(storeId: string) {
  return {
    logo: `${storeId}/logo.png`,
    icon192: `${storeId}/pwa/icon-192x192.png`,
    icon512: `${storeId}/pwa/icon-512x512.png`,
  };
}

/** Sube el logo cuadrado de la tienda y genera iconos PWA (192 y 512). */
export async function uploadStoreLogoImage(
  supabase: SupabaseClient,
  storeId: string,
  file: File,
): Promise<UploadStoreLogoResult> {
  if (file.size > MAX_QR_INPUT_SIZE) {
    return { error: "La imagen supera el límite de 2 MB." };
  }

  const processed = await processStoreLogoFile(file);
  if (!processed.ok) {
    return { error: processed.error };
  }

  const { logoPng, icon192, icon512, warning } = processed.assets;
  const paths = getStoreLogoStoragePaths(storeId);

  const uploads = [
    { path: paths.logo, body: logoPng, contentType: "image/png" },
    { path: paths.icon192, body: icon192, contentType: "image/png" },
    { path: paths.icon512, body: icon512, contentType: "image/png" },
  ] as const;

  for (const item of uploads) {
    const { error: uploadError } = await supabase.storage
      .from(STORE_LOGOS_BUCKET)
      .upload(item.path, item.body, {
        cacheControl: "31536000",
        upsert: true,
        contentType: item.contentType,
      });

    if (uploadError) {
      return { error: uploadError.message };
    }
  }

  const { data: logoData } = supabase.storage
    .from(STORE_LOGOS_BUCKET)
    .getPublicUrl(paths.logo);
  const { data: icon192Data } = supabase.storage
    .from(STORE_LOGOS_BUCKET)
    .getPublicUrl(paths.icon192);
  const { data: icon512Data } = supabase.storage
    .from(STORE_LOGOS_BUCKET)
    .getPublicUrl(paths.icon512);

  return {
    url: logoData.publicUrl,
    pwaIcon192Url: icon192Data.publicUrl,
    pwaIcon512Url: icon512Data.publicUrl,
    warning,
  };
}

export async function removeStoreLogoAssets(
  supabase: SupabaseClient,
  storeId: string,
): Promise<void> {
  const paths = Object.values(getStoreLogoStoragePaths(storeId));
  await supabase.storage.from(STORE_LOGOS_BUCKET).remove(paths);
}

export interface UploadPlatformLogoResult {
  url?: string;
  pwaIcon192Url?: string;
  pwaIcon512Url?: string;
  error?: string;
}

function getPlatformLogoStoragePaths() {
  return {
    logo: "brand/logo.webp",
    icon192: "brand/pwa/icon-192x192.png",
    icon512: "brand/pwa/icon-512x512.png",
  };
}

/** Sube el logo principal de la plataforma y genera iconos PWA (192 y 512). */
export async function uploadPlatformLogoImage(
  supabase: SupabaseClient,
  file: File,
): Promise<UploadPlatformLogoResult> {
  if (file.size > MAX_QR_INPUT_SIZE) {
    return { error: "La imagen supera el límite de 2 MB." };
  }

  const processed = await processPlatformLogoFile(file);
  if (!processed.ok) {
    return { error: processed.error };
  }

  const { logoWebp, icon192, icon512 } = processed.assets;
  const paths = getPlatformLogoStoragePaths();
  const version = Date.now();

  const uploads = [
    { path: paths.logo, body: logoWebp, contentType: "image/webp" },
    { path: paths.icon192, body: icon192, contentType: "image/png" },
    { path: paths.icon512, body: icon512, contentType: "image/png" },
  ] as const;

  for (const item of uploads) {
    const { error: uploadError } = await supabase.storage
      .from(PLATFORM_ASSETS_BUCKET)
      .upload(item.path, item.body, {
        cacheControl: "31536000",
        upsert: true,
        contentType: item.contentType,
      });

    if (uploadError) {
      return { error: uploadError.message };
    }
  }

  const { data: logoData } = supabase.storage
    .from(PLATFORM_ASSETS_BUCKET)
    .getPublicUrl(paths.logo);
  const { data: icon192Data } = supabase.storage
    .from(PLATFORM_ASSETS_BUCKET)
    .getPublicUrl(paths.icon192);
  const { data: icon512Data } = supabase.storage
    .from(PLATFORM_ASSETS_BUCKET)
    .getPublicUrl(paths.icon512);

  return {
    url: `${logoData.publicUrl}?v=${version}`,
    pwaIcon192Url: `${icon192Data.publicUrl}?v=${version}`,
    pwaIcon512Url: `${icon512Data.publicUrl}?v=${version}`,
  };
}

export async function removePlatformLogoAsset(supabase: SupabaseClient): Promise<void> {
  const paths = Object.values(getPlatformLogoStoragePaths());
  await supabase.storage.from(PLATFORM_ASSETS_BUCKET).remove(paths);
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
