import { cache } from "react";
import { getSupabaseAnonClient } from "@/lib/supabase";
import { getDisplayableUsdExchangeRate } from "@/lib/exchange-rate/get-tasa-cambio";
import { ensureBcvRateFreshForToday } from "@/lib/exchange-rate/ensure-bcv-rate-fresh";
import { CATALOG_LIST_SELECT, PUBLIC_CATALOG_LIST_SELECT } from "@/lib/inventory/constants";
import { buildInventorySearchOrFilter } from "@/lib/inventory/search";
import { roundExchangeRate } from "@/lib/format";
import type { CatalogListItem, ExchangeRate } from "@/lib/database.types";
import { sortCatalogProducts } from "@/lib/catalog/catalog-browse";
import { parseCatalogGalleryImages } from "@/lib/products/product-gallery-types";
import { listDropshipLinkedCatalogEntriesForStoreSlug } from "@/lib/dropship/linked-catalog";
import { applySupplierCategoriesToCatalogItems } from "@/lib/catalog/apply-supplier-categories";
import { withPublicCatalogCache } from "@/lib/catalog/public-catalog-cache";
import {
  applySupplierGalleryToCatalogItems,
  resolveSupplierGalleryForProductIds,
} from "@/lib/catalog/resolve-supplier-gallery";

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
  /** Precio mínimo en USD (moneda base). */
  minPriceUsd?: number | null;
  /** Precio máximo en USD (moneda base). */
  maxPriceUsd?: number | null;
  /** Restringe a IDs concretos (p. ej. hidratar carrito). */
  productIds?: string[];
}

/** Orden estándar del catálogo público: con stock primero, agotados al final. */
export function applyPublicCatalogProductOrder<
  Q extends {
    order: (
      column: string,
      options?: { ascending?: boolean },
    ) => Q;
  },
>(query: Q): Q {
  return query
    .order("stock_list_rank", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
}

/** Fallback cuando `stock_list_rank` aún no existe en la vista (pre-migración). */
export function applyLegacyCatalogProductOrder<
  Q extends {
    order: (
      column: string,
      options?: { ascending?: boolean },
    ) => Q;
  },
>(query: Q): Q {
  return query
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
}

function isCatalogSchemaCompatibilityError(message: string): boolean {
  return /column|does not exist|Could not find|stock_list_rank/i.test(message);
}

type CatalogProductsQueryMode = "ranked" | "legacy";

interface CatalogProductsQueryOptions {
  storeSlug: string;
  select: string;
  paginated: boolean;
  offset: number;
  limit: number;
  productIds?: string[];
  searchOr: string | null;
  minPriceUsd?: number | null;
  maxPriceUsd?: number | null;
  mode: CatalogProductsQueryMode;
}

function buildCatalogProductsQuery(
  supabase: ReturnType<typeof getSupabaseAnonClient>,
  options: CatalogProductsQueryOptions,
) {
  const {
    storeSlug,
    select,
    paginated,
    offset,
    limit,
    productIds,
    searchOr,
    minPriceUsd,
    maxPriceUsd,
    mode,
  } = options;

  const baseQuery = supabase
    .from("catalog_list_view")
    .select(select, paginated ? { count: "exact" } : undefined)
    .eq("store_slug", storeSlug);

  let query =
    mode === "ranked"
      ? applyPublicCatalogProductOrder(baseQuery)
      : applyLegacyCatalogProductOrder(baseQuery);

  if (productIds?.length) {
    query = query.in("product_id", productIds);
  }

  if (searchOr) {
    query = query.or(searchOr);
  }

  if (minPriceUsd != null) {
    query = query.gte("price_usd", minPriceUsd);
  }

  if (maxPriceUsd != null) {
    query = query.lte("price_usd", maxPriceUsd);
  }

  if (paginated) {
    query = query.range(offset, offset + limit - 1);
  }

  return query;
}

async function runCatalogProductsQuery(
  options: CatalogProductsQueryOptions,
) {
  const supabase = getSupabaseAnonClient();
  return buildCatalogProductsQuery(supabase, options);
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

    // Carry-forward: última tasa con effective_date <= hoy VE (o espejo tasas_cambio).
    // Si el BCV aún no publicó hoy, se mantiene la de ayer y la app no se queda sin precio.
    const current = await getDisplayableUsdExchangeRate(supabase);

    // Si estamos un día atrás, autoheal intenta actualizar sin borrar el carry-forward.
    return ensureBcvRateFreshForToday(current);
  },
);

function catalogProductsCacheKey(options: GetCatalogOptions): string[] {
  const productIds = options.productIds?.length
    ? [...options.productIds].sort().join(",")
    : "";
  return [
    options.storeSlug.trim().toLowerCase(),
    String(options.limit ?? ""),
    String(options.offset ?? 0),
    options.categorySlug?.trim().toLowerCase() ?? "",
    (options.search ?? "").trim().toLowerCase(),
    options.minPriceUsd == null ? "" : String(options.minPriceUsd),
    options.maxPriceUsd == null ? "" : String(options.maxPriceUsd),
    productIds,
  ];
}

async function loadCatalogProductsUncached(
  options: GetCatalogOptions,
): Promise<CatalogPageData> {
  const {
    storeSlug,
    limit = 24,
    offset = 0,
    categorySlug,
    search,
    minPriceUsd,
    maxPriceUsd,
    productIds,
  } = options;
  const normalizedSlug = storeSlug.trim().toLowerCase();
  const linkedEntries =
    await listDropshipLinkedCatalogEntriesForStoreSlug(normalizedSlug);
  const linkedProductIds = linkedEntries.map((entry) => entry.productId);

  if (linkedProductIds.length === 0) {
    return {
      products: [],
      exchangeRate: await getCurrentExchangeRate(),
      totalCount: 0,
      hasMore: false,
    };
  }

  const requestedCategory = categorySlug?.trim().toLowerCase() ?? "";
  const categoryProductIds = requestedCategory
    ? linkedEntries
        .filter((entry) => entry.supplierCategory === requestedCategory)
        .map((entry) => entry.productId)
    : linkedProductIds;

  const allowedProductIds = productIds?.length
    ? productIds.filter((id) => categoryProductIds.includes(id))
    : categoryProductIds;

  if (allowedProductIds.length === 0) {
    return {
      products: [],
      exchangeRate: await getCurrentExchangeRate(),
      totalCount: 0,
      hasMore: false,
    };
  }

  // Paginación solo en listados; las hidrataciones por IDs traen el set completo.
  const paginated = limit != null && productIds == null;
  const searchOr = buildInventorySearchOrFilter(search ?? "") || null;

  const baseQueryOptions: Omit<CatalogProductsQueryOptions, "select" | "mode"> =
    {
      storeSlug: normalizedSlug,
      paginated,
      offset,
      limit,
      productIds: allowedProductIds,
      searchOr,
      minPriceUsd: minPriceUsd ?? null,
      maxPriceUsd: maxPriceUsd ?? null,
    };
  let queryMode: CatalogProductsQueryMode = "ranked";
  let selectColumns = PUBLIC_CATALOG_LIST_SELECT;
  const exchangeRatePromise = getCurrentExchangeRate();

  let productsResult = await runCatalogProductsQuery({
    ...baseQueryOptions,
    select: selectColumns,
    mode: queryMode,
  });

  const exchangeRate = await exchangeRatePromise;

  if (productsResult.error) {
    if (isCatalogSchemaCompatibilityError(productsResult.error.message)) {
      queryMode = "legacy";
      productsResult = await runCatalogProductsQuery({
        ...baseQueryOptions,
        select: selectColumns,
        mode: queryMode,
      });
    }

    if (
      productsResult.error &&
      isCatalogSchemaCompatibilityError(productsResult.error.message)
    ) {
      selectColumns = CATALOG_LIST_SELECT;
      productsResult = await runCatalogProductsQuery({
        ...baseQueryOptions,
        select: selectColumns,
        mode: queryMode,
      });
    }

    if (productsResult.error) {
      throw new Error(productsResult.error.message);
    }
  }

  let products = applySupplierCategoriesToCatalogItems(
    (productsResult.data ?? []).map((row) =>
      normalizeCatalogItem(row as unknown as CatalogListItem),
    ),
    linkedEntries,
  );

  const supplierGalleryByProductId = await resolveSupplierGalleryForProductIds(
    products.map((product) => product.product_id),
  );
  products = applySupplierGalleryToCatalogItems(
    products,
    supplierGalleryByProductId,
  );

  if (queryMode === "legacy") {
    products = sortCatalogProducts(products, "featured");
  }

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

/**
 * Catálogo filtrado: solo productos importados del hub mayorista (dropshipping puro).
 * Listados públicos usan Data Cache (~60s + tag). Hidratar por IDs (carrito)
 * va en vivo para no vender stock ya reservado.
 */
export async function getCatalogProducts(
  options: GetCatalogOptions,
): Promise<CatalogPageData> {
  if (options.productIds?.length) {
    return loadCatalogProductsUncached(options);
  }

  const normalizedSlug = options.storeSlug.trim().toLowerCase();
  return withPublicCatalogCache(
    ["public-catalog-products-v1", ...catalogProductsCacheKey(options)],
    { slug: normalizedSlug },
    () => loadCatalogProductsUncached({ ...options, storeSlug: normalizedSlug }),
  );
}
