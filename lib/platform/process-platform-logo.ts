import "server-only";

import sharp from "sharp";

export interface ProcessedPlatformLogoAssets {
  logoBuffer: Buffer;
  logoContentType: "image/webp" | "image/svg+xml";
  logoExtension: "webp" | "svg";
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

async function compressPlatformLogoRaster(input: Buffer): Promise<
  | { ok: true; buffer: Buffer }
  | { ok: false; error: string }
> {
  try {
    const buffer = await sharp(input, { animated: false })
      .rotate()
      .resize(640, 160, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 92, alphaQuality: 100 })
      .toBuffer();

    return { ok: true, buffer };
  } catch {
    return { ok: false, error: "No se pudo procesar la imagen. Prueba con otro archivo." };
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

  let logoBuffer: Buffer;
  try {
    const compressed = await compressPlatformLogoRaster(input);
    if (!compressed.ok) {
      return compressed;
    }
    logoBuffer = compressed.buffer;
  } catch {
    return { ok: false, error: "No se pudo procesar la imagen. Prueba con otro archivo." };
  }

  return {
    ok: true,
    assets: {
      logoBuffer,
      logoContentType: "image/webp",
      logoExtension: "webp",
      icon192: icons.icon192,
      icon512: icons.icon512,
    },
  };
}
