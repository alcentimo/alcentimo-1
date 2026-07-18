import sharp from "sharp";
import { STORE_LOGO_RECOMMENDED_SIZE } from "@/lib/store-logo/constants";
import { validateStoreLogoDimensions, validateStoreLogoMimeType } from "@/lib/store-logo/validate";

export interface ProcessedStoreLogoAssets {
  logoPng: Buffer;
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

  const input = Buffer.from(await file.arrayBuffer());
  return processStoreLogoBuffer(input);
}

export async function processStoreLogoBuffer(
  input: Buffer,
): Promise<
  | { ok: true; assets: ProcessedStoreLogoAssets }
  | { ok: false; error: string }
> {
  let width = 0;
  let height = 0;
  try {
    const metadata = await sharp(input, { animated: false }).metadata();
    width = metadata.width ?? 0;
    height = metadata.height ?? 0;
  } catch {
    return { ok: false, error: "No se pudo procesar la imagen. Usa un PNG válido." };
  }

  const validation = validateStoreLogoDimensions(width, height);

  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  try {
    const logoPng = await sharp(input, { animated: false })
      .rotate()
      .resize(STORE_LOGO_RECOMMENDED_SIZE, STORE_LOGO_RECOMMENDED_SIZE, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();

    const icon192 = await sharp(logoPng)
      .resize(192, 192, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    const icon512 = logoPng;

    return {
      ok: true,
      assets: {
        logoPng,
        icon192,
        icon512,
        warning: validation.warning,
      },
    };
  } catch {
    return { ok: false, error: "No se pudo generar el logo optimizado." };
  }
}
