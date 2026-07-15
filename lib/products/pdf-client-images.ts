"use client";

import type { CatalogListItem } from "@/lib/database.types";

const PDF_CLIENT_MAX_EDGE = 72;
const PDF_CLIENT_JPEG_QUALITY = 0.62;
const PDF_CLIENT_MAX_SOURCE_BYTES = 1.5 * 1024 * 1024;
const PDF_CLIENT_FETCH_TIMEOUT_MS = 6000;
const PDF_CLIENT_BATCH_SIZE = 3;

function isSafeImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Comprime miniaturas en el navegador antes de armar el PDF (menor peso final). */
export async function compressCatalogImageForPdf(
  url: string | null,
): Promise<string | null> {
  if (!url || !isSafeImageUrl(url)) return null;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(PDF_CLIENT_FETCH_TIMEOUT_MS),
      cache: "force-cache",
    });

    if (!response.ok) return null;

    const blob = await response.blob();
    if (blob.size > PDF_CLIENT_MAX_SOURCE_BYTES) return null;

    const objectUrl = URL.createObjectURL(blob);

    try {
      const dataUrl = await new Promise<string | null>((resolve) => {
        const image = new Image();
        image.decoding = "async";

        image.onload = () => {
          const scale = Math.min(
            PDF_CLIENT_MAX_EDGE / image.naturalWidth,
            PDF_CLIENT_MAX_EDGE / image.naturalHeight,
            1,
          );
          const width = Math.max(1, Math.round(image.naturalWidth * scale));
          const height = Math.max(1, Math.round(image.naturalHeight * scale));

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const context = canvas.getContext("2d");
          if (!context) {
            resolve(null);
            return;
          }

          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, width, height);
          context.drawImage(image, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", PDF_CLIENT_JPEG_QUALITY));
        };

        image.onerror = () => resolve(null);
        image.src = objectUrl;
      });

      return dataUrl;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
}

export async function compressCatalogImagesForPdf(
  products: CatalogListItem[],
): Promise<Record<string, string | null>> {
  const images: Record<string, string | null> = {};

  for (let index = 0; index < products.length; index += PDF_CLIENT_BATCH_SIZE) {
    const batch = products.slice(index, index + PDF_CLIENT_BATCH_SIZE);

    await Promise.all(
      batch.map(async (product) => {
        images[product.product_id] = await compressCatalogImageForPdf(
          product.thumb_url,
        );
      }),
    );
  }

  return images;
}
