import type { SupabaseClient } from "@supabase/supabase-js";
import {
  compressBannerImage,
  compressProductImage,
  formatFileSize,
  type ImageOptimizationResult,
} from "@/lib/image-compress";
import {
  BANNER_MAX_OUTPUT_BYTES,
  BANNER_WEBP_QUALITY,
  getBannerMaxDimensions,
  type BannerImageVariant,
} from "@/lib/banner-image";
import {
  PRODUCT_IMAGE_MAX_DIMENSION,
  PRODUCT_IMAGE_MAX_INPUT_BYTES,
  PRODUCT_IMAGE_MAX_OUTPUT_BYTES,
  PRODUCT_IMAGE_WEBP_QUALITY,
} from "@/lib/product-image";
import {
  STORE_LOGO_GIF_MAX_BYTES,
  STORE_LOGO_MAX_BYTES,
} from "@/lib/store-logo/constants";
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

/** Imagen ya optimizada en cliente (WebP ≤120 KB) — evita recomprimir con Sharp. */
function isClientOptimizedProductImage(file: File): boolean {
  return (
    file.type === "image/webp" &&
    file.size > 0 &&
    file.size <= PRODUCT_IMAGE_MAX_OUTPUT_BYTES
  );
}

async function resolveProductImageOptimization(
  inputBuffer: Buffer,
  file: File,
): Promise<ImageOptimizationResult> {
  if (!isClientOptimizedProductImage(file)) {
    return compressProductImage(inputBuffer);
  }

  const sharp = (await import("sharp")).default;
  const meta = await sharp(inputBuffer, { animated: false }).metadata();
  const width = meta.width ?? PRODUCT_IMAGE_MAX_DIMENSION;
  const height = meta.height ?? PRODUCT_IMAGE_MAX_DIMENSION;

  if (
    width <= PRODUCT_IMAGE_MAX_DIMENSION &&
    height <= PRODUCT_IMAGE_MAX_DIMENSION
  ) {
    return {
      buffer: inputBuffer,
      width,
      height,
      originalSize: inputBuffer.length,
      compressedSize: inputBuffer.length,
      quality: Math.round(PRODUCT_IMAGE_WEBP_QUALITY * 100),
      format: "webp",
    };
  }

  return compressProductImage(inputBuffer);
}

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
    optimization = await resolveProductImageOptimization(inputBuffer, file);
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

function isClientOptimizedBannerImage(file: File): boolean {
  return (
    file.type === "image/webp" &&
    file.size > 0 &&
    file.size <= BANNER_MAX_OUTPUT_BYTES
  );
}

async function resolveBannerImageOptimization(
  inputBuffer: Buffer,
  file: File,
  variant: BannerImageVariant,
): Promise<ImageOptimizationResult> {
  if (!isClientOptimizedBannerImage(file)) {
    return compressBannerImage(inputBuffer, variant);
  }

  const sharp = (await import("sharp")).default;
  const meta = await sharp(inputBuffer, { animated: false }).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const { maxWidth, maxHeight } = getBannerMaxDimensions(variant);

  if (width <= maxWidth && height <= maxHeight) {
    return {
      buffer: inputBuffer,
      width,
      height,
      originalSize: inputBuffer.length,
      compressedSize: inputBuffer.length,
      quality: Math.round(BANNER_WEBP_QUALITY * 100),
      format: "webp",
    };
  }

  return compressBannerImage(inputBuffer, variant);
}

/** Sube banners promocionales optimizados al bucket store-assets. */
export async function uploadCatalogBannerAssetImage(
  supabase: SupabaseClient,
  storeId: string,
  file: File,
  variant: BannerImageVariant,
): Promise<UploadStoreAssetResult> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Formato no permitido. Usa JPG, PNG, WebP o GIF." };
  }

  if (file.size > MAX_INPUT_SIZE) {
    return {
      error: `La imagen supera el límite de ${formatFileSize(MAX_INPUT_SIZE)}.`,
    };
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  let optimization: ImageOptimizationResult;
  try {
    optimization = await resolveBannerImageOptimization(
      inputBuffer,
      file,
      variant,
    );
  } catch {
    return { error: "No se pudo procesar la imagen. Prueba con otro archivo." };
  }

  const safeFolder = "catalog-banners";
  const path = `${storeId}/${safeFolder}/${variant}-${crypto.randomUUID()}.webp`;

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

/** Sube imágenes de configuración (QR Pago Móvil, avatar IA, etc.) al bucket store-assets. */
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
  const safeFolder = folder.replace(/[^a-z0-9-]/gi, "");
  const isGif = file.type === "image/gif";

  // GIFs animados: subir el original sin Sharp/WebP (congelaría la animación).
  if (isGif) {
    const path = `${storeId}/${safeFolder}/${crypto.randomUUID()}.gif`;
    const { error: uploadError } = await supabase.storage
      .from(STORE_ASSETS_BUCKET)
      .upload(path, inputBuffer, {
        cacheControl: "31536000",
        upsert: false,
        contentType: "image/gif",
      });

    if (uploadError) {
      return { error: uploadError.message };
    }

    const { data } = supabase.storage
      .from(STORE_ASSETS_BUCKET)
      .getPublicUrl(path);

    return { url: data.publicUrl };
  }

  let optimization: ImageOptimizationResult;
  try {
    optimization = await compressProductImage(inputBuffer);
  } catch {
    return { error: "No se pudo procesar la imagen. Prueba con otro archivo." };
  }

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

function getStoreLogoStoragePaths(
  storeId: string,
  logoExtension: "png" | "gif" = "png",
) {
  return {
    logo: `${storeId}/logo.${logoExtension}`,
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
  const isGif = file.type === "image/gif";
  const maxBytes = isGif ? STORE_LOGO_GIF_MAX_BYTES : STORE_LOGO_MAX_BYTES;
  if (file.size > maxBytes) {
    return {
      error: `La imagen supera el límite de ${formatFileSize(maxBytes)}.`,
    };
  }

  const processed = await processStoreLogoFile(file);
  if (!processed.ok) {
    return { error: processed.error };
  }

  const { logoBuffer, logoContentType, logoExtension, icon192, icon512, warning } =
    processed.assets;
  const paths = getStoreLogoStoragePaths(storeId, logoExtension);
  // Misma ruta con upsert + Cache-Control largo: sin ?v= el navegador/CDN
  // sigue sirviendo el PNG antiguo aunque la DB ya apunte al archivo nuevo.
  const version = Date.now();

  // Si cambia PNG ↔ GIF, elimina el archivo del formato anterior.
  const alternateLogoPath =
    logoExtension === "gif" ? `${storeId}/logo.png` : `${storeId}/logo.gif`;
  await supabase.storage.from(STORE_LOGOS_BUCKET).remove([alternateLogoPath]);

  const uploads = [
    { path: paths.logo, body: logoBuffer, contentType: logoContentType },
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
    url: `${logoData.publicUrl}?v=${version}`,
    pwaIcon192Url: `${icon192Data.publicUrl}?v=${version}`,
    pwaIcon512Url: `${icon512Data.publicUrl}?v=${version}`,
    warning,
  };
}

export async function removeStoreLogoAssets(
  supabase: SupabaseClient,
  storeId: string,
): Promise<void> {
  const paths = [
    ...Object.values(getStoreLogoStoragePaths(storeId, "png")),
    ...Object.values(getStoreLogoStoragePaths(storeId, "gif")),
  ];
  const uniquePaths = [...new Set(paths)];
  await supabase.storage.from(STORE_LOGOS_BUCKET).remove(uniquePaths);
}

export interface UploadPlatformLogoResult {
  url?: string;
  pwaIcon192Url?: string;
  pwaIcon512Url?: string;
  error?: string;
}

function getPlatformLogoStoragePaths(logoExtension: "webp" | "svg" = "webp") {
  return {
    logo: logoExtension === "svg" ? "brand/logo.svg" : "brand/logo.webp",
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

  const { logoBuffer, logoContentType, logoExtension, icon192, icon512 } =
    processed.assets;
  const paths = getPlatformLogoStoragePaths(logoExtension);
  const version = Date.now();

  const uploads = [
    { path: paths.logo, body: logoBuffer, contentType: logoContentType },
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

  const alternateLogoPath =
    logoExtension === "svg" ? "brand/logo.webp" : "brand/logo.svg";
  await supabase.storage.from(PLATFORM_ASSETS_BUCKET).remove([alternateLogoPath]);

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
  const paths = [
    ...Object.values(getPlatformLogoStoragePaths("webp")),
    ...Object.values(getPlatformLogoStoragePaths("svg")),
  ];
  const uniquePaths = [...new Set(paths)];
  await supabase.storage.from(PLATFORM_ASSETS_BUCKET).remove(uniquePaths);
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
