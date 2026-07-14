import type { Area } from "react-easy-crop";

/** Relación de aspecto del catálogo (vertical 4:5). */
export const PRODUCT_IMAGE_ASPECT_RATIO = 4 / 5;

/**
 * Recorte centrado en porcentajes (0–100) para react-easy-crop.
 * En fotos horizontales recorta los lados; en verticales recorta arriba/abajo.
 */
export function getCenteredCropAreaPercentages(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number = PRODUCT_IMAGE_ASPECT_RATIO,
): Area {
  const mediaAspect = mediaWidth / mediaHeight;

  if (mediaAspect > aspect) {
    const cropWidthPercent = (aspect / mediaAspect) * 100;
    return {
      x: (100 - cropWidthPercent) / 2,
      y: 0,
      width: cropWidthPercent,
      height: 100,
    };
  }

  const cropHeightPercent = (mediaAspect / aspect) * 100;
  return {
    x: 0,
    y: (100 - cropHeightPercent) / 2,
    width: 100,
    height: cropHeightPercent,
  };
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("No se pudo cargar la imagen.")));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = src;
  });
}

/** Genera un JPEG recortado desde el área en píxeles (react-easy-crop). */
export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: Area,
  mimeType: "image/jpeg" | "image/webp" = "image/jpeg",
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No se pudo preparar el recorte de la imagen.");
  }

  canvas.width = Math.max(1, Math.round(pixelCrop.width));
  canvas.height = Math.max(1, Math.round(pixelCrop.height));

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo generar la imagen recortada."));
          return;
        }
        resolve(blob);
      },
      mimeType,
      0.92,
    );
  });
}

export function readFileAsObjectUrl(file: File): string {
  return URL.createObjectURL(file);
}
