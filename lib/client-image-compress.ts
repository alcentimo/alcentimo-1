import imageCompression from "browser-image-compression";

const MAX_SIZE_MB = 0.5; // 500 KB
const MAX_WIDTH_OR_HEIGHT = 1200;

function formatKb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function toWebpFile(blob: Blob, originalName: string): File {
  const baseName = originalName.replace(/\.[^.]+$/, "") || "producto";
  return new File([blob], `${baseName}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

/**
 * Comprime en el navegador antes de enviar al Server Action.
 * Objetivo: WebP ≤ 500 KB para evitar el límite de 1 MB del body.
 */
export async function compressImageForUpload(
  file: File,
): Promise<{ file: File; message: string }> {
  const originalSize = file.size;

  const compressed = await imageCompression(file, {
    maxSizeMB: MAX_SIZE_MB,
    maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.82,
    maxIteration: 12,
  });

  const webpFile =
    compressed.type === "image/webp"
      ? toWebpFile(compressed, file.name)
      : toWebpFile(compressed, file.name);

  const message = `Optimizada en tu dispositivo: ${formatKb(originalSize)} → ${formatKb(webpFile.size)} (WebP).`;

  return { file: webpFile, message };
}
