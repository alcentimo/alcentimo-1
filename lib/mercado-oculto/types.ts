import { supplierCategoryLabel } from "@/lib/supplier/categories";

/** Tarjeta de la vitrina interna (producto mayorista oficial). */
export interface MercadoProductCard {
  product_id: string;
  product_name: string;
  short_description: string | null;
  price_usd: number;
  thumb_url: string | null;
  category_name: string;
  available_stock: number;
  created_at: string;
  seller_user_id: string;
  store_name: string;
}

export function mapSupplierRowToMercadoCard(
  row: Record<string, unknown>,
): MercadoProductCard {
  return {
    product_id: String(row.id),
    product_name: String(row.title ?? ""),
    short_description:
      typeof row.description === "string" && row.description.trim()
        ? row.description.trim()
        : null,
    price_usd: Number(row.base_price_usd) || 0,
    thumb_url:
      typeof row.image_url === "string" && row.image_url.trim()
        ? row.image_url.trim()
        : null,
    category_name: supplierCategoryLabel(
      typeof row.category === "string" ? row.category : null,
    ),
    available_stock: Number(row.stock) || 0,
    created_at: String(row.created_at ?? ""),
    seller_user_id: String(row.created_by ?? ""),
    store_name: "Mayorista Alcéntimo",
  };
}
