import {
  normalizeSupplierProductCategory,
  supplierCategoryLabel,
  type SupplierProductCategory,
} from "@/lib/supplier/categories";
import type { SupplierProductVariants } from "@/lib/supplier/variants";
import { normalizeSupplierProductVariants } from "@/lib/supplier/variants";
import { MORICHE_BRAND_LABEL } from "@/lib/mercado-oculto/access";

/** Tarjeta / detalle de la vitrina mayorista B2B. */
export interface MercadoProductCard {
  product_id: string;
  product_name: string;
  short_description: string | null;
  price_usd: number;
  /** Precio de lista para tachado; null si no hay promo. */
  compare_at_usd: number | null;
  /** Porcentaje de descuento entero (1–99) cuando compare_at > price. */
  discount_percent: number | null;
  free_shipping: boolean;
  thumb_url: string | null;
  category: SupplierProductCategory;
  category_name: string;
  available_stock: number;
  created_at: string;
  seller_user_id: string;
  store_name: string;
  supplier_label: string;
  variants: SupplierProductVariants;
  /** Galería completa; thumb_url es la portada (primera). */
  gallery_urls: string[];
}

export function computeDiscountPercent(
  priceUsd: number,
  compareAtUsd: number | null,
): number | null {
  if (
    compareAtUsd == null ||
    !Number.isFinite(compareAtUsd) ||
    !Number.isFinite(priceUsd) ||
    compareAtUsd <= priceUsd ||
    priceUsd < 0
  ) {
    return null;
  }
  const pct = Math.round((1 - priceUsd / compareAtUsd) * 100);
  if (pct < 1 || pct > 99) return null;
  return pct;
}

export function mapSupplierRowToMercadoCard(
  row: Record<string, unknown>,
  supplierLabel = MORICHE_BRAND_LABEL,
  galleryUrls?: string[],
): MercadoProductCard {
  const category = normalizeSupplierProductCategory(row.category);
  const priceUsd = Number(row.base_price_usd) || 0;
  const compareRaw = row.compare_at_usd;
  const compareAtUsd =
    compareRaw == null || compareRaw === ""
      ? null
      : Number.isFinite(Number(compareRaw))
        ? Number(compareRaw)
        : null;
  const coverFromRow =
    typeof row.image_url === "string" && row.image_url.trim()
      ? row.image_url.trim()
      : null;
  const urls =
    galleryUrls && galleryUrls.length > 0
      ? galleryUrls
      : coverFromRow
        ? [coverFromRow]
        : [];

  return {
    product_id: String(row.id),
    product_name: String(row.title ?? ""),
    short_description:
      typeof row.description === "string" && row.description.trim()
        ? row.description.trim()
        : null,
    price_usd: priceUsd,
    compare_at_usd: compareAtUsd,
    discount_percent: computeDiscountPercent(priceUsd, compareAtUsd),
    free_shipping: Boolean(row.free_shipping),
    thumb_url: urls[0] ?? null,
    gallery_urls: urls,
    category,
    category_name: supplierCategoryLabel(category),
    available_stock: Number(row.stock) || 0,
    created_at: String(row.created_at ?? ""),
    seller_user_id: String(row.created_by ?? ""),
    store_name: supplierLabel,
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
  freeShippingCount: number;
}
