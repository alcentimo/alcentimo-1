import { cache } from "react";
import { getSupabaseAnonClient } from "@/lib/supabase";
import { getLatestUsdTasa } from "@/lib/exchange-rate/get-tasa-cambio";
import { PUBLIC_CATALOG_LIST_SELECT } from "@/lib/inventory/constants";
import { buildInventorySearchOrFilter } from "@/lib/inventory/search";
import { roundExchangeRate } from "@/lib/format";
import type { CatalogListItem, ExchangeRate } from "@/lib/database.types";
import { parseCatalogGalleryImages } from "@/lib/products/product-gallery-types";

export interface CatalogPageData {
  products: CatalogListItem[];
  exchangeRate: ExchangeRate | null;
  totalCount: number;
  hasMore: boolean;
}

export interface GetCatalogOptions {
  storeSlug: string;
  limit?: number;
  offset?: number;
  categorySlug?: string;
  /** Búsqueda por nombre, SKU o slug (server-side). */
  search?: string;
  /** Restringe a IDs concretos (p. ej. hidratar carrito). */
  productIds?: string[];
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const parsed = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCatalogItem(row: CatalogListItem): CatalogListItem {
  return {
    ...row,
    stock_quantity: toNumber(row.stock_quantity) ?? 0,
    reserved_quantity: toNumber(row.reserved_quantity) ?? 0,
    available_stock: toNumber(row.available_stock) ?? 0,
    low_stock_threshold: toNumber(row.low_stock_threshold) ?? 5,
    price_usd: toNumber(row.price_usd),
    price_ves: toNumber(row.price_ves),
    compare_at_usd: toNumber(row.compare_at_usd),
    compare_at_ves: toNumber(row.compare_at_ves),
    wholesale_price_usd: toNumber(row.wholesale_price_usd),
    wholesale_min_qty:
      row.wholesale_min_qty != null ? Number(row.wholesale_min_qty) : null,
    exchange_rate_used: toNumber(row.exchange_rate_used),
    gallery_images: parseCatalogGalleryImages(row.gallery_images),
  };
}

function normalizeExchangeRate(row: ExchangeRate): ExchangeRate {
  return {
    ...row,
    rate: roundExchangeRate(toNumber(row.rate) ?? 0),
  };
}

export const getCurrentExchangeRate = cache(
  async (): Promise<ExchangeRate | null> => {
    const supabase = getSupabaseAnonClient();
    const tasa = await getLatestUsdTasa(supabase);
    if (tasa && tasa.tasa > 0) {
      return {
        id: `tasas_cambio:${tasa.moneda}`,
        rate: roundExchangeRate(tasa.tasa),
        source: "bcv",
        effective_date: tasa.ultima_actualizacion.slice(0, 10),
        notes: "Tasa BCV sincronizada automáticamente",
        store_id: null,
        created_at: tasa.ultima_actualizacion,
      };
    }

    const { data, error } = await supabase
      .from("exchange_rate")
      .select("*")
      .is("store_id", null)
      .order("effective_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? normalizeExchangeRate(data) : null;
  },
);

/** Catálogo filtrado estrictamente por tienda (vista catalog_list_view). */
export async function getCatalogProducts(
  options: GetCatalogOptions,
): Promise<CatalogPageData> {
  const {
    storeSlug,
    limit = 24,
    offset = 0,
    categorySlug,
    search,
    productIds,
  } = options;
  const normalizedSlug = storeSlug.trim().toLowerCase();
  const supabase = getSupabaseAnonClient();
  const paginated = limit != null && productIds == null;

  let query = supabase
    .from("catalog_list_view")
    .select(PUBLIC_CATALOG_LIST_SELECT, paginated ? { count: "exact" } : undefined)
    .eq("store_slug", normalizedSlug)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (categorySlug) {
    query = query.eq("category_slug", categorySlug);
  }

  if (productIds?.length) {
    query = query.in("product_id", productIds);
  }

  const searchOr = buildInventorySearchOrFilter(search ?? "");
  if (searchOr) {
    query = query.or(searchOr);
  }

  if (paginated) {
    query = query.range(offset, offset + limit - 1);
  }

  const [productsResult, exchangeRate] = await Promise.all([
    query,
    getCurrentExchangeRate(),
  ]);

  if (productsResult.error) {
    throw new Error(productsResult.error.message);
  }

  const products = (productsResult.data ?? []).map((row) =>
    normalizeCatalogItem(row as unknown as CatalogListItem),
  );
  const totalCount = paginated
    ? (productsResult.count ?? products.length)
    : products.length;

  return {
    products,
    exchangeRate,
    totalCount,
    hasMore: paginated ? offset + products.length < totalCount : false,
  };
}
