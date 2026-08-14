import {
  normalizeSupplierProductCategory,
  supplierCategoryLabel,
  type SupplierProductCategory,
} from "@/lib/supplier/categories";
import type { SupplierProductVariants } from "@/lib/supplier/variants";
import { normalizeSupplierProductVariants } from "@/lib/supplier/variants";

/** Tarjeta / detalle de la vitrina mayorista B2B. */
export interface MercadoProductCard {
  product_id: string;
  product_name: string;
  short_description: string | null;
  price_usd: number;
  thumb_url: string | null;
  category: SupplierProductCategory;
  category_name: string;
  available_stock: number;
  created_at: string;
  seller_user_id: string;
  store_name: string;
  supplier_label: string;
  variants: SupplierProductVariants;
}

export function mapSupplierRowToMercadoCard(
  row: Record<string, unknown>,
  supplierLabel = "Mayorista Oficial Alcéntimo",
): MercadoProductCard {
  const category = normalizeSupplierProductCategory(row.category);
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
    category,
    category_name: supplierCategoryLabel(category),
    available_stock: Number(row.stock) || 0,
    created_at: String(row.created_at ?? ""),
    seller_user_id: String(row.created_by ?? ""),
    store_name: "Mayorista Oficial Alcéntimo",
    supplier_label: supplierLabel,
    variants: normalizeSupplierProductVariants(row.variants),
  };
}

export interface MercadoSupplierFacet {
  id: string;
  label: string;
  count: number;
}

export interface MercadoCategoryFacet {
  value: string;
  label: string;
  count: number;
}

export interface MercadoCatalogFacets {
  categories: MercadoCategoryFacet[];
  suppliers: MercadoSupplierFacet[];
  priceMin: number;
  priceMax: number;
}
