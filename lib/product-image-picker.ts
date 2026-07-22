import { compressImageForUpload } from "@/lib/client-image-compress";
import type { Area } from "react-easy-crop";
import {
  getCenteredCropAreaPercentages,
  getCroppedImageBlob,
  loadImage,
  percentCropToPixels,
  readFileAsObjectUrl,
} from "@/lib/product-image-crop";

/** Acepta cualquier imagen; en móvil filtra solo fotos. */
export const PRODUCT_IMAGE_FILE_ACCEPT = "image/*";

/**
 * Prefiere la cámara frontal en móvil.
 * El usuario puede cancelar y elegir de la galería, o cambiar a la trasera si el SO lo permite.
 */
export const PRODUCT_IMAGE_FILE_CAPTURE = "user";

export const PRODUCT_IMAGE_CAMERA_HINT =
  "En móvil puedes tomar una foto (cámara) o cancelar y elegir una de la galería.";

export type CompressProductImageResult =
  | { ok: true; file: File; previewUrl: string; message: string }
  | { ok: false; error: string };

export async function compressSelectedProductImage(
  rawFile: File | Blob,
  fileName = "producto.jpg",
): Promise<CompressProductImageResult> {
  try {
    const file =
      rawFile instanceof File
        ? rawFile
        : new File([rawFile], fileName.replace(/\.[^.]+$/, "") + ".jpg", {
            type: rawFile.type || "image/jpeg",
            lastModified: Date.now(),
          });
    const { file: compressed, message } = await compressImageForUpload(file);
    return {
      ok: true,
      file: compressed,
      previewUrl: URL.createObjectURL(compressed),
      message,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo comprimir la imagen. Prueba con JPG o PNG.",
    };
  }
}

export function revokeProductImagePreview(url: string | null | undefined) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

export type AutoProcessProductImageResult =
  | {
      ok: true;
      file: File;
      previewUrl: string;
      message: string;
      originalUrl: string;
      cropPercentages: Area;
      fileName: string;
    }
  | { ok: false; error: string };

/** Recorte centrado 1:1 + compresión WebP automática tras elegir archivo. */
export async function autoCropAndCompressProductImage(
  file: File,
): Promise<AutoProcessProductImageResult> {
  let originalUrl: string | null = null;

  try {
    originalUrl = readFileAsObjectUrl(file);
    const image = await loadImage(originalUrl);
    const cropPercentages = getCenteredCropAreaPercentages(
      image.naturalWidth,
      image.naturalHeight,
    );
    const pixelCrop = percentCropToPixels(
      cropPercentages,
      image.naturalWidth,
      image.naturalHeight,
    );
    const croppedBlob = await getCroppedImageBlob(originalUrl, pixelCrop);
    const compressed = await compressSelectedProductImage(croppedBlob, file.name);

    if (!compressed.ok) {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      return compressed;
    }

    return {
      ok: true,
      file: compressed.file,
      previewUrl: compressed.previewUrl,
      message: compressed.message,
      originalUrl,
      cropPercentages,
      fileName: file.name,
    };
  } catch (error) {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo procesar la imagen. Prueba con otra foto.",
    };
  }
}
