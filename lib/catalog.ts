import "server-only";

import { cache } from "react";
import { getSupabaseAnonClient } from "@/lib/supabase";
import { getPublicServerClient } from "@/lib/supabase/public-server";
import { getDisplayableUsdExchangeRate } from "@/lib/exchange-rate/get-tasa-cambio";
import { ensureBcvRateFreshForToday } from "@/lib/exchange-rate/ensure-bcv-rate-fresh";
import { CATALOG_LIST_SELECT, PUBLIC_CATALOG_LIST_SELECT } from "@/lib/inventory/constants";
import { buildInventorySearchOrFilter } from "@/lib/inventory/search";
import { roundExchangeRate } from "@/lib/format";
import type { CatalogListItem, ExchangeRate } from "@/lib/database.types";
import { sortCatalogProducts } from "@/lib/catalog/catalog-browse";
import { parseCatalogGalleryImages } from "@/lib/products/product-gallery-types";
import {
  listDropshipLinkedCatalogEntriesForStoreId,
  listDropshipLinkedCatalogEntriesForStoreSlug,
  type DropshipLinkedCatalogEntry,
} from "@/lib/dropship/linked-catalog";
import {
  applySupplierCategoriesToCatalogItems,
  attachHubTrendToCatalogItems,
} from "@/lib/catalog/apply-supplier-categories";
import { getSupplierTrendScores } from "@/lib/dropship/trend";
import { withPublicCatalogCache } from "@/lib/catalog/public-catalog-cache";
import { listOwnBrandCatalogEntries } from "@/lib/supplier/own-store-ids";
import {
  applySupplierGalleryToCatalogItems,
  resolveSupplierGalleryForProductIds,
} from "@/lib/catalog/resolve-supplier-gallery";
import { isPlatformAdminOwnedStore } from "@/lib/gift-cards/admin-store";
import { GIFT_CARD_CATEGORY_SLUG } from "@/lib/gift-cards/catalog";
import {
  listAdminGiftCardCatalogProductIds,
  stripGiftCardsFromCatalogItems,
} from "@/lib/gift-cards/catalog-visibility";
import { getPublicStoreBySlug } from "@/lib/stores";

export interface CatalogPageData {
  products: CatalogListItem[];
  exchangeRate: ExchangeRate | null;
  totalCount: number;
  hasMore: boolean;
}

export interface GetCatalogOptions {
  storeSlug: string;
  /** Evita un segundo lookup por slug; la vitrina ya resolvió la tienda. */
  storeId?: string;
  limit?: number;
  offset?: number;
  categorySlug?: string;
  /** Búsqueda por nombre, SKU o slug (server-side). */
  search?: string;
  /** Precio mínimo en USD (moneda base). */
  minPriceUsd?: number | null;
  /** Precio máximo en USD (moneda base). */
  maxPriceUsd?: number | null;
  /** Marca oficial de Alcéntimo (filtro de vitrina). */
  brand?: string | null;
  /** Restringe a IDs concretos (p. ej. hidratar carrito). */
  productIds?: string[];
  /** Deep-link por slug público (`/producto/camisa-manga-corta-a4f2`). */
  productSlug?: string;
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
  storeId?: string;
  select: string;
  paginated: boolean;
  offset: number;
  limit: number;
  productIds?: string[];
  productSlug?: string;
  searchOr: string | null;
  minPriceUsd?: number | null;
  maxPriceUsd?: number | null;
  brand?: string | null;
  mode: CatalogProductsQueryMode;
}

function buildCatalogProductsQuery(
  supabase: ReturnType<typeof getPublicServerClient>,
  options: CatalogProductsQueryOptions,
) {
  const {
    storeSlug,
    storeId,
    select,
    paginated,
    offset,
    limit,
    productIds,
    productSlug,
    searchOr,
    minPriceUsd,
    maxPriceUsd,
    brand,
    mode,
  } = options;

  let baseQuery = supabase
    .from("catalog_list_view")
    .select(select, paginated ? { count: "exact" } : undefined)
    .eq("store_slug", storeSlug);

  if (storeId?.trim()) {
    baseQuery = baseQuery.eq("store_id", storeId.trim());
  }

  let query =
    mode === "ranked"
      ? applyPublicCatalogProductOrder(baseQuery)
      : applyLegacyCatalogProductOrder(baseQuery);

  if (productIds?.length) {
    query = query.in("product_id", productIds);
  }

  if (productSlug) {
    query = query.eq("product_slug", productSlug);
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

  const brandFilter = brand?.trim();
  if (brandFilter) {
    query = query.ilike("brand", brandFilter);
  }

  if (paginated) {
    query = query.range(offset, offset + limit - 1);
  }

  return query;
}

async function runCatalogProductsQuery(
  options: CatalogProductsQueryOptions,
) {
  const supabase = getPublicServerClient();
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
    options.storeId?.trim() ?? "",
    String(options.limit ?? ""),
    String(options.offset ?? 0),
    options.categorySlug?.trim().toLowerCase() ?? "",
    (options.search ?? "").trim().toLowerCase(),
    options.minPriceUsd == null ? "" : String(options.minPriceUsd),
    options.maxPriceUsd == null ? "" : String(options.maxPriceUsd),
    options.brand?.trim().toLowerCase() ?? "",
    productIds,
    options.productSlug?.trim().toLowerCase() ?? "",
    "union-own",
    "hub-trend-v1",
    "gift-cards-admin-only",
  ];
}

/** PostgREST `.in()` por GET se rompe con muchos UUID (vitrina vacía tras carga masiva). */
export const CATALOG_PRODUCT_IN_CHUNK = 80;

function mergeLinkedCatalogEntries(
  groups: DropshipLinkedCatalogEntry[][],
): DropshipLinkedCatalogEntry[] {
  const map = new Map<string, DropshipLinkedCatalogEntry>();
  for (const group of groups) {
    for (const entry of group) {
      if (!entry.productId || map.has(entry.productId)) continue;
      map.set(entry.productId, entry);
    }
  }
  return [...map.values()];
}

async function loadCatalogProductsUncached(
  options: GetCatalogOptions,
): Promise<CatalogPageData> {
  const {
    storeSlug,
    storeId,
    limit = 24,
    offset = 0,
    categorySlug,
    search,
    minPriceUsd,
    maxPriceUsd,
    brand,
    productIds,
    productSlug,
  } = options;
  const normalizedSlug = storeSlug.trim().toLowerCase();
  const resolvedStoreId =
    storeId?.trim() ||
    (await getPublicStoreBySlug(normalizedSlug))?.id?.trim() ||
    "";
  const dropshipEntries = resolvedStoreId
    ? await listDropshipLinkedCatalogEntriesForStoreId(resolvedStoreId)
    : await listDropshipLinkedCatalogEntriesForStoreSlug(normalizedSlug);
  const ownEntries = resolvedStoreId
    ? await listOwnBrandCatalogEntries(resolvedStoreId)
    : [];
  const adminOwned = resolvedStoreId
    ? await isPlatformAdminOwnedStore(resolvedStoreId)
    : false;
  const giftCardProductIds = resolvedStoreId
    ? await listAdminGiftCardCatalogProductIds(resolvedStoreId)
    : [];
  const giftCardIdSet = new Set(giftCardProductIds);
  const linkedEntries = mergeLinkedCatalogEntries([dropshipEntries, ownEntries]);
  const linkedProductIds = linkedEntries.map((entry) => entry.productId);

  const requestedCategory = categorySlug?.trim().toLowerCase() ?? "";
  const unionVisibleIds = (() => {
    const ids = [...linkedProductIds];
    for (const giftId of giftCardProductIds) {
      if (!ids.includes(giftId)) ids.push(giftId);
    }
    return ids;
  })();
  const categoryProductIds =
    requestedCategory === GIFT_CARD_CATEGORY_SLUG
      ? adminOwned
        ? giftCardProductIds
        : []
      : requestedCategory
        ? linkedEntries
            .filter((entry) => entry.supplierCategory === requestedCategory)
            .map((entry) => entry.productId)
            .filter((id) => !giftCardIdSet.has(id))
        : unionVisibleIds;

  const allowedProductIds = productIds?.length
    ? productIds.filter((id) => {
        if (giftCardIdSet.has(id)) return adminOwned;
        if (categoryProductIds.length > 0) {
          return categoryProductIds.includes(id);
        }
        return true;
      })
    : categoryProductIds.length > 0
      ? categoryProductIds
      : undefined;

  if (
    requestedCategory === GIFT_CARD_CATEGORY_SLUG &&
    (!adminOwned || giftCardProductIds.length === 0)
  ) {
    return {
      products: [],
      exchangeRate: await getCurrentExchangeRate(),
      totalCount: 0,
      hasMore: false,
    };
  }

  if (productIds?.length && (allowedProductIds?.length ?? 0) === 0) {
    return {
      products: [],
      exchangeRate: await getCurrentExchangeRate(),
      totalCount: 0,
      hasMore: false,
    };
  }

  // Paginación solo en listados; las hidrataciones por IDs traen el set completo.
  // Filtro de tienda: store_slug + store_id en catalog_list_view (productos activos).
  // Los vínculos dropship enriquecen categorías; no vacían la vitrina si fallan.
  const paginated =
    limit != null && productIds == null && !productSlug?.trim();
  const searchOr = buildInventorySearchOrFilter(search ?? "") || null;

  const trendScores = productIds?.length
    ? new Map<string, number>()
    : await getSupplierTrendScores();
  const supplierIdByProduct = new Map(
    linkedEntries
      .filter((entry) => Boolean(entry.supplierProductId))
      .map((entry) => [entry.productId, entry.supplierProductId as string]),
  );

  const trendOrderedIds =
    allowedProductIds &&
    allowedProductIds.length > 0 &&
    supplierIdByProduct.size > 0
      ? [...allowedProductIds].sort((left, right) => {
          const leftSupplier = supplierIdByProduct.get(left);
          const rightSupplier = supplierIdByProduct.get(right);
          const delta =
            (rightSupplier ? (trendScores.get(rightSupplier) ?? 0) : 0) -
            (leftSupplier ? (trendScores.get(leftSupplier) ?? 0) : 0);
          if (delta !== 0) return delta;
          return left.localeCompare(right);
        })
      : null;

  const pageProductIds =
    paginated &&
    trendOrderedIds &&
    !searchOr &&
    minPriceUsd == null &&
    maxPriceUsd == null &&
    !(brand?.trim())
      ? trendOrderedIds.slice(offset, offset + limit)
      : null;

  if (paginated && trendOrderedIds && (pageProductIds?.length ?? 0) === 0) {
    return {
      products: [],
      exchangeRate: await getCurrentExchangeRate(),
      totalCount: trendOrderedIds.length,
      hasMore: false,
    };
  }

  const useInFilter = Boolean(
    pageProductIds?.length ||
      (Boolean(allowedProductIds?.length) &&
        (allowedProductIds?.length ?? 0) <= CATALOG_PRODUCT_IN_CHUNK),
  );

  const queryProductIds = pageProductIds?.length
    ? pageProductIds
    : useInFilter
      ? allowedProductIds
      : undefined;

  const skipSqlRange = Boolean(pageProductIds?.length);

  const baseQueryOptions: Omit<CatalogProductsQueryOptions, "select" | "mode"> =
    {
      storeSlug: normalizedSlug,
      storeId: resolvedStoreId || storeId?.trim() || undefined,
      paginated: paginated && !skipSqlRange,
      offset: skipSqlRange ? 0 : offset,
      limit,
      productIds: queryProductIds,
      productSlug: productSlug?.trim().toLowerCase() || undefined,
      searchOr,
      minPriceUsd: minPriceUsd ?? null,
      maxPriceUsd: maxPriceUsd ?? null,
      brand: brand?.trim() || null,
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
  products = attachHubTrendToCatalogItems(products, linkedEntries, trendScores);

  if (!useInFilter && (allowedProductIds?.length ?? 0) > 0) {
    const allowed = new Set(allowedProductIds);
    products = products.filter((product) => allowed.has(product.product_id));
  } else if (requestedCategory && linkedEntries.length === 0) {
    products = products.filter(
      (product) => product.category_slug === requestedCategory,
    );
  }

  const supplierGalleryByProductId = await resolveSupplierGalleryForProductIds(
    products.map((product) => product.product_id),
  );
  products = applySupplierGalleryToCatalogItems(
    products,
    supplierGalleryByProductId,
  );

  if (pageProductIds?.length) {
    const order = new Map(
      pageProductIds.map((id, index) => [id, index] as const),
    );
    products = [...products].sort(
      (a, b) =>
        (order.get(a.product_id) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(b.product_id) ?? Number.MAX_SAFE_INTEGER),
    );
  } else {
    products = sortCatalogProducts(products, "featured");
  }

  products = stripGiftCardsFromCatalogItems(products, adminOwned);

  const totalCount = paginated
    ? (trendOrderedIds?.length ?? productsResult.count ?? products.length)
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
    ["public-catalog-products-v5", ...catalogProductsCacheKey(options)],
    { slug: normalizedSlug, storeId: options.storeId },
    () => loadCatalogProductsUncached({ ...options, storeSlug: normalizedSlug }),
  );
}
