import { compressImageForUpload } from "@/lib/client-image-compress";

/** Acepta cualquier imagen; en móvil habilita cámara y galería. */
export const PRODUCT_IMAGE_FILE_ACCEPT = "image/*";

/** Prioriza cámara trasera al tomar foto (Chrome/Safari móvil). */
export const PRODUCT_IMAGE_FILE_CAPTURE = "environment";

export const PRODUCT_IMAGE_CAMERA_HINT =
  "En móvil puedes tomar foto con la cámara trasera o elegir de la galería.";

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
      file,
      previewUrl: URL.createObjectURL(file),
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
