import sharp from "sharp";
import {
  compressProductImage,
  type ImageOptimizationResult,
} from "@/lib/image-compress";

export interface ProcessedPlatformLogoAssets {
  logoBuffer: Buffer;
  logoContentType: "image/webp" | "image/svg+xml";
  logoExtension: "webp" | "svg";
  optimization?: ImageOptimizationResult;
  icon192: Buffer;
  icon512: Buffer;
}

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

async function buildPwaIcons(input: Buffer): Promise<
  | { ok: true; icon192: Buffer; icon512: Buffer }
  | { ok: false; error: string }
> {
  try {
    const icon512 = await sharp(input, { animated: false, density: 300 })
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

    return { ok: true, icon192, icon512 };
  } catch {
    return { ok: false, error: "No se pudo generar los iconos PWA del logo." };
  }
}

export async function processPlatformLogoFile(
  file: File,
): Promise<
  | { ok: true; assets: ProcessedPlatformLogoAssets }
  | { ok: false; error: string }
> {
  const isSvg =
    file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");

  if (!isSvg && !ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: "Formato no permitido. Usa PNG, SVG, WebP o JPG." };
  }

  const input = Buffer.from(await file.arrayBuffer());
  const icons = await buildPwaIcons(input);
  if (!icons.ok) {
    return icons;
  }

  if (isSvg) {
    return {
      ok: true,
      assets: {
        logoBuffer: input,
        logoContentType: "image/svg+xml",
        logoExtension: "svg",
        icon192: icons.icon192,
        icon512: icons.icon512,
      },
    };
  }

  let optimization: ImageOptimizationResult;
  try {
    optimization = await compressProductImage(input);
  } catch {
    return { ok: false, error: "No se pudo procesar la imagen. Prueba con otro archivo." };
  }

  return {
    ok: true,
    assets: {
      logoBuffer: optimization.buffer,
      logoContentType: "image/webp",
      logoExtension: "webp",
      optimization,
      icon192: icons.icon192,
      icon512: icons.icon512,
    },
  };
}
