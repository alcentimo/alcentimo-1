import { formatUsd } from "@/lib/format";

export interface CatalogProductSharePayload {
  productName: string;
  shareUrl: string;
  priceUsd?: number | null;
  storeName?: string | null;
}

/** Texto listo para WhatsApp / share nativo: título, precio y enlace. */
export function buildProductShareText({
  productName,
  shareUrl,
  priceUsd,
  storeName,
}: CatalogProductSharePayload): string {
  const title = productName.trim() || "Producto";
  const lines = [title];
  if (priceUsd != null && Number.isFinite(priceUsd)) {
    lines.push(`Precio: ${formatUsd(priceUsd)}`);
  }
  if (storeName?.trim()) {
    lines.push(storeName.trim());
  }
  if (shareUrl.trim()) {
    lines.push(shareUrl.trim());
  }
  return lines.join("\n");
}

export function buildWhatsAppShareHref(text: string): string {
  const params = new URLSearchParams({ text });
  return `https://wa.me/?${params.toString()}`;
}

export function buildNativeShareData({
  productName,
  shareUrl,
  priceUsd,
  storeName,
}: CatalogProductSharePayload): ShareData {
  const title = productName.trim() || "Producto";
  const priceLine =
    priceUsd != null && Number.isFinite(priceUsd)
      ? `Precio: ${formatUsd(priceUsd)}`
      : "";
  const storeLine = storeName?.trim() || "";
  const text = [title, priceLine, storeLine].filter(Boolean).join("\n");
  return {
    title,
    text,
    url: shareUrl.trim() || undefined,
  };
}
