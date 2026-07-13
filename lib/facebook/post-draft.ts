import type { CatalogListItem } from "@/lib/database.types";
import { formatUsd } from "@/lib/format";
import { getSiteUrl } from "@/lib/site-url";

export function buildProductPostDraft(product: CatalogListItem): string {
  const siteUrl = getSiteUrl();
  const price =
    product.price_usd != null ? formatUsd(product.price_usd) : null;

  const lines = [
    product.product_name,
    price ? `Precio: ${price}` : null,
    product.short_description?.trim() || null,
    `Compra aquí: ${siteUrl}/tienda/${product.store_slug}`,
  ].filter((line): line is string => Boolean(line));

  return lines.join("\n\n");
}
