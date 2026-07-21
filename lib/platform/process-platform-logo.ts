import sharp from "sharp";
import {
  compressProductImage,
  type ImageOptimizationResult,
} from "@/lib/image-compress";

export interface ProcessedPlatformLogoAssets {
  logoWebp: Buffer;
  optimization: ImageOptimizationResult;
  icon192: Buffer;
  icon512: Buffer;
}

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function processPlatformLogoFile(
  file: File,
): Promise<
  | { ok: true; assets: ProcessedPlatformLogoAssets }
  | { ok: false; error: string }
> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: "Formato no permitido. Usa JPG, PNG, WebP o GIF." };
  }

  const input = Buffer.from(await file.arrayBuffer());

  let optimization: ImageOptimizationResult;
  try {
    optimization = await compressProductImage(input);
  } catch {
    return { ok: false, error: "No se pudo procesar la imagen. Prueba con otro archivo." };
  }

  try {
    const icon512 = await sharp(input, { animated: false })
      .rotate()
      .resize(512, 512, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();

    const icon192 = await sharp(icon512)
      .resize(192, 192, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
      .toBuffer();

    return {
      ok: true,
      assets: {
        logoWebp: optimization.buffer,
        optimization,
        icon192,
        icon512,
      },
    };
  } catch {
    return { ok: false, error: "No se pudo generar los iconos PWA del logo." };
  }
}
