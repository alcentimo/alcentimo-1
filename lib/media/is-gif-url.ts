/** Detecta URLs de GIF (incluye query `?v=` de cache-bust). */
export function isGifImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;

  try {
    const path = new URL(url, "https://local.invalid").pathname.toLowerCase();
    return path.endsWith(".gif");
  } catch {
    return /\.gif(?:$|[?#])/i.test(url);
  }
}

export function isGifImageFile(file: Pick<File, "type" | "name">): boolean {
  if (file.type.trim().toLowerCase() === "image/gif") return true;
  return /\.gif$/i.test(file.name);
}
