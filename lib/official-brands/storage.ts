import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { PLATFORM_ASSETS_BUCKET } from "@/lib/storage-buckets";

const MAX_INPUT_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

async function loadSharp() {
  return (await import("sharp")).default;
}

export async function uploadOfficialBrandLogo(input: {
  client: SupabaseClient;
  brandId: string;
  file: File;
}): Promise<{ url?: string; path?: string; error?: string }> {
  if (input.file.size <= 0) {
    return { error: "El archivo de logo está vacío." };
  }
  if (input.file.size > MAX_INPUT_BYTES) {
    return { error: "El logo supera el límite de 2 MB." };
  }
  if (!ALLOWED_TYPES.has(input.file.type)) {
    return { error: "Usa un logo JPG, PNG, WebP o GIF." };
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  let webp: Buffer;
  try {
    const sharp = await loadSharp();
    webp = await sharp(buffer, { animated: false })
      .rotate()
      .resize(320, 320, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return { error: "No se pudo procesar el logo." };
  }

  const path = `official-brands/${input.brandId}/logo.webp`;
  const { error: uploadError } = await input.client.storage
    .from(PLATFORM_ASSETS_BUCKET)
    .upload(path, webp, {
      cacheControl: "31536000",
      upsert: true,
      contentType: "image/webp",
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data } = input.client.storage
    .from(PLATFORM_ASSETS_BUCKET)
    .getPublicUrl(path);

  return { url: `${data.publicUrl}?v=${Date.now()}`, path };
}

export async function removeOfficialBrandLogo(input: {
  client: SupabaseClient;
  path: string | null | undefined;
}): Promise<void> {
  const path = input.path?.trim();
  if (!path) return;
  await input.client.storage.from(PLATFORM_ASSETS_BUCKET).remove([path]);
}
