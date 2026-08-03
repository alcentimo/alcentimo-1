import sharp from "sharp";
import { STORE_LOGO_RECOMMENDED_SIZE } from "@/lib/store-logo/constants";
import {
  validateStoreLogoDimensions,
  validateStoreLogoFileSize,
  validateStoreLogoMimeType,
} from "@/lib/store-logo/validate";

export type StoreLogoOutputFormat = "png" | "gif";

export interface ProcessedStoreLogoAssets {
  /** Logo público (PNG optimizado o GIF animado original). */
  logoBuffer: Buffer;
  logoContentType: "image/png" | "image/gif";
  logoExtension: StoreLogoOutputFormat;
  icon192: Buffer;
  icon512: Buffer;
  warning?: string;
}

export async function processStoreLogoFile(
  file: File,
): Promise<
  | { ok: true; assets: ProcessedStoreLogoAssets }
  | { ok: false; error: string }
> {
  const mimeError = validateStoreLogoMimeType(file.type);
  if (mimeError) {
    return { ok: false, error: mimeError };
  }

  const isGifMime = file.type.trim().toLowerCase() === "image/gif";
  const sizeError = validateStoreLogoFileSize(file.size, isGifMime);
  if (sizeError) {
    return { ok: false, error: sizeError };
  }

  const input = Buffer.from(await file.arrayBuffer());
  return processStoreLogoBuffer(input, file.type);
}

export async function processStoreLogoBuffer(
  input: Buffer,
  mimeType?: string,
): Promise<
  | { ok: true; assets: ProcessedStoreLogoAssets }
  | { ok: false; error: string }
> {
  let width = 0;
  let height = 0;
  let format: string | undefined;

  try {
    const metadata = await sharp(input, { animated: true }).metadata();
    width = metadata.width ?? 0;
    // Con animated:true, `height` puede ser la suma de fotogramas.
    // `pageHeight` es el alto real de un solo fotograma del GIF.
    height = metadata.pageHeight ?? metadata.height ?? 0;
    format = metadata.format;
  } catch {
    return {
      ok: false,
      error: "No se pudo procesar la imagen. Usa un PNG, JPG o GIF válido.",
    };
  }

  const isGif =
    format === "gif" || mimeType?.trim().toLowerCase() === "image/gif";

  // Si Sharp no dio pageHeight y el alto parece apilado, usar el primer fotograma.
  if (isGif && width > 0 && height > width * 2) {
    try {
      const frameMeta = await sharp(input, { animated: false, pages: 1 }).metadata();
      width = frameMeta.width ?? width;
      height = frameMeta.height ?? width;
    } catch {
      // Mantener dimensiones previas; la validación de GIF omitirá el tope de px.
    }
  }

  const validation = validateStoreLogoDimensions(width, height, {
    skipMaxPixelCheck: isGif,
  });

  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  const sizeError = validateStoreLogoFileSize(input.length, isGif);
  if (sizeError) {
    return { ok: false, error: sizeError };
  }

  try {
    // Iconos PWA: siempre un fotograma estático PNG (los GIFs no sirven bien como icono).
    const iconSource = await sharp(input, { animated: false, pages: 1 })
      .rotate()
      .resize(STORE_LOGO_RECOMMENDED_SIZE, STORE_LOGO_RECOMMENDED_SIZE, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();

    const icon192 = await sharp(iconSource)
      .resize(192, 192, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    if (isGif) {
      const gifNote =
        "GIF animado conservado. La PWA usará un fotograma estático.";
      return {
        ok: true,
        assets: {
          logoBuffer: input,
          logoContentType: "image/gif",
          logoExtension: "gif",
          icon192,
          icon512: iconSource,
          warning: validation.warning
            ? `${validation.warning} ${gifNote}`
            : gifNote,
        },
      };
    }

    return {
      ok: true,
      assets: {
        logoBuffer: iconSource,
        logoContentType: "image/png",
        logoExtension: "png",
        icon192,
        icon512: iconSource,
        warning: validation.warning,
      },
    };
  } catch {
    return { ok: false, error: "No se pudo generar el logo optimizado." };
  }
}
