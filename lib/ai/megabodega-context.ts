import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { MERCADO_CATALOG_CACHE_TAG } from "@/lib/mercado-oculto/catalog-cache";
import {
  normalizeSupplierProductCategory,
  supplierCategoryLabel,
} from "@/lib/supplier/categories";
import {
  applyDropshipVisibleProductFilter,
  DROPSHIP_SUPPLIER_PRODUCT_SELECT,
  isPublishedForDropship,
  resolvePrecioMayoristaUsd,
  resolveSuggestedRetailUsd,
} from "@/lib/supplier/wholesale-price";

export type MegabodegaAudience = "dropshipper" | "customer";

export type MegabodegaCatalogRow = {
  name: string;
  category: string;
  stock: number;
  suggestedRetailUsd: number | null;
  wholesaleUsd: number | null;
};

export type MegabodegaAssistantSnapshot = {
  source: "megabodega";
  totalProducts: number;
  inStockCount: number;
  outOfStockCount: number;
  items: MegabodegaCatalogRow[];
  matchedQuery: string | null;
  fetchedAt: string;
};

const MEGABODEGA_CACHE_LIMIT = 180;
const MAX_PROMPT_ITEMS = 18;
const SEARCH_STOP_WORDS = new Set([
  "que",
  "qué",
  "cual",
  "cuál",
  "cuales",
  "cuáles",
  "hay",
  "tiene",
  "tienen",
  "stock",
  "precio",
  "precios",
  "producto",
  "productos",
  "disponible",
  "disponibles",
  "ahora",
  "para",
  "este",
  "esta",
  "esto",
  "me",
  "un",
  "una",
  "el",
  "la",
  "los",
  "las",
  "de",
  "del",
  "al",
  "con",
  "por",
  "en",
]);

type CachedMegabodegaRow = {
  name: string;
  categoryKey: string;
  category: string;
  stock: number;
  suggestedRetailUsd: number | null;
  wholesaleUsd: number | null;
};

type CachedMegabodegaCatalog = {
  rows: CachedMegabodegaRow[];
  fetchedAt: string;
};

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function extractAssistantSearchQuery(
  messages: Array<{ role: string; content: string }>,
): string | null {
  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  if (!lastUser) return null;
  const query = lastUser.content.trim();
  if (query.length < 3 || query.length > 120) return null;
  return query;
}

function queryTokens(query: string | null): string[] {
  if (!query) return [];
  return normalizeSearchText(query)
    .split(/[^a-z0-9áéíóúñü]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !SEARCH_STOP_WORDS.has(token));
}

function rowMatchesQuery(row: CachedMegabodegaRow, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const haystack = normalizeSearchText(`${row.name} ${row.category} ${row.categoryKey}`);
  return tokens.some((token) => haystack.includes(token));
}

async function loadMegabodegaCatalogUncached(): Promise<CachedMegabodegaCatalog> {
  const admin = createAdminClient();
  const { data, error } = await applyDropshipVisibleProductFilter(
    admin
      .from("supplier_products")
      .select(DROPSHIP_SUPPLIER_PRODUCT_SELECT),
  )
    .order("stock", { ascending: false })
    .limit(MEGABODEGA_CACHE_LIMIT);

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data as Record<string, unknown>[] | null) ?? [])
    .filter(isPublishedForDropship)
    .map((row) => {
      const categoryKey = normalizeSupplierProductCategory(row.category);
      return {
        name: String(row.title ?? "").trim(),
        categoryKey,
        category: supplierCategoryLabel(categoryKey),
        stock: Number(row.stock) || 0,
        suggestedRetailUsd: resolveSuggestedRetailUsd(row),
        wholesaleUsd: resolvePrecioMayoristaUsd(row),
      };
    })
    .filter((row) => row.name.length > 0);

  return {
    rows,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Snapshot ligero y compartido del inventario centralizado (Megabodega).
 * Cache ~60s; no se consulta por tienda.
 */
export const getCachedMegabodegaCatalog = unstable_cache(
  async () => loadMegabodegaCatalogUncached(),
  ["assistant-megabodega-catalog-v1"],
  { revalidate: 60, tags: [MERCADO_CATALOG_CACHE_TAG] },
);

export async function getMegabodegaAssistantSnapshot(options: {
  audience: MegabodegaAudience;
  searchQuery?: string | null;
}): Promise<MegabodegaAssistantSnapshot> {
  const catalog = await getCachedMegabodegaCatalog();
  const tokens = queryTokens(options.searchQuery ?? null);
  const ranked = tokens.length
    ? catalog.rows.filter((row) => rowMatchesQuery(row, tokens))
    : catalog.rows;

  const inStockCount = catalog.rows.filter((row) => row.stock > 0).length;
  const sliced = ranked.slice(0, MAX_PROMPT_ITEMS);

  return {
    source: "megabodega",
    totalProducts: catalog.rows.length,
    inStockCount,
    outOfStockCount: catalog.rows.length - inStockCount,
    items: sliced.map((row) => ({
      name: row.name,
      category: row.category,
      stock: row.stock,
      suggestedRetailUsd: row.suggestedRetailUsd,
      wholesaleUsd:
        options.audience === "dropshipper" ? row.wholesaleUsd : null,
    })),
    matchedQuery: tokens.length ? options.searchQuery ?? null : null,
    fetchedAt: catalog.fetchedAt,
  };
}

export function compactMegabodegaForPrompt(
  snapshot: MegabodegaAssistantSnapshot,
  audience: MegabodegaAudience,
): string {
  const lines: string[] = [
    `Megabodega Alcentimo: ${snapshot.totalProducts} SKU, en stock ${snapshot.inStockCount}, agotados ${snapshot.outOfStockCount}`,
  ];

  if (snapshot.matchedQuery) {
    lines.push(`Filtro: ${snapshot.matchedQuery}`);
  }

  for (const item of snapshot.items) {
    const suggested =
      item.suggestedRetailUsd != null ? `PVP${item.suggestedRetailUsd}` : "PVP?";
    const wholesale =
      audience === "dropshipper" && item.wholesaleUsd != null
        ? ` may${item.wholesaleUsd}`
        : "";
    lines.push(
      `${item.name} (${item.category}) ${suggested}${wholesale} stk${item.stock}`,
    );
  }

  if (snapshot.totalProducts > snapshot.items.length) {
    lines.push(`(+${snapshot.totalProducts - snapshot.items.length} SKU más en Megabodega)`);
  }

  return lines.join("\n");
}
