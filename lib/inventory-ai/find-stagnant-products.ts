import type { SupabaseClient } from "@supabase/supabase-js";
import {
  STAGNANT_SOFT_DAYS,
  type StagnantProductCandidate,
} from "@/lib/inventory-ai/types";

interface ProductScanRow {
  id: string;
  name: string;
  created_at: string;
  is_featured: boolean | null;
  stock: number | null;
  product_images?: { thumb_url?: string | null; is_primary?: boolean }[] | null;
  product_variants?: {
    id: string;
    is_default: boolean | null;
    is_active: boolean | null;
    stock_quantity: number | null;
    reserved_quantity: number | null;
    product_prices?: {
      amount_usd: number | string | null;
    }[] | null;
  }[] | null;
}

function daysBetween(fromIso: string, to = new Date()): number {
  const from = new Date(fromIso).getTime();
  if (!Number.isFinite(from)) return 0;
  const diff = to.getTime() - from;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function pickThumb(
  images: ProductScanRow["product_images"],
): string | null {
  if (!images?.length) return null;
  const primary = images.find((img) => img.is_primary) ?? images[0];
  return primary?.thumb_url ?? null;
}

function resolveAvailableStock(row: ProductScanRow): number {
  const variants = (row.product_variants ?? []).filter(
    (variant) => variant.is_active !== false,
  );
  if (variants.length > 0) {
    return variants.reduce((sum, variant) => {
      const stock = Number(variant.stock_quantity ?? 0);
      const reserved = Number(variant.reserved_quantity ?? 0);
      return sum + Math.max(0, stock - reserved);
    }, 0);
  }
  return Math.max(0, Number(row.stock ?? 0));
}

function resolvePriceUsd(row: ProductScanRow): number | null {
  const variants = row.product_variants ?? [];
  const preferred =
    variants.find((variant) => variant.is_default) ?? variants[0];
  const amount = preferred?.product_prices?.[0]?.amount_usd;
  if (amount == null) return null;
  const n = Number(amount);
  return Number.isFinite(n) ? n : null;
}

/**
 * Productos activos con stock y sin ventas/pedidos en los últimos N días
 * (umbral suave: 30 días). Incluye días exactos sin movimiento.
 */
export async function findStagnantProductsForStore(
  supabase: SupabaseClient,
  storeId: string,
  options?: { minDays?: number; limit?: number },
): Promise<StagnantProductCandidate[]> {
  const minDays = options?.minDays ?? STAGNANT_SOFT_DAYS;
  const limit = options?.limit ?? 12;

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      created_at,
      is_featured,
      stock,
      product_images ( thumb_url, is_primary ),
      product_variants (
        id,
        is_default,
        is_active,
        stock_quantity,
        reserved_quantity,
        product_prices ( amount_usd )
      )
    `,
    )
    .eq("store_id", storeId)
    .eq("is_active", true)
    .eq("is_deleted", false)
    .limit(500);

  if (productsError) {
    throw new Error(productsError.message);
  }

  const rows = (products ?? []) as ProductScanRow[];
  if (rows.length === 0) return [];

  const productIds = rows.map((row) => row.id);

  const [ventasResult, ordersResult] = await Promise.all([
    supabase
      .from("ventas")
      .select("producto_id, created_at")
      .eq("store_id", storeId)
      .in("producto_id", productIds)
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase
      .from("orders")
      .select("items, created_at, estado")
      .eq("store_id", storeId)
      .neq("estado", "cancelado")
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);

  if (ventasResult.error) throw new Error(ventasResult.error.message);
  if (ordersResult.error) throw new Error(ordersResult.error.message);

  const lastSaleByProduct = new Map<string, string>();

  for (const venta of ventasResult.data ?? []) {
    const productId = String(
      (venta as { producto_id?: string }).producto_id ?? "",
    );
    const at = String((venta as { created_at?: string }).created_at ?? "");
    if (!productId || !at) continue;
    const prev = lastSaleByProduct.get(productId);
    if (!prev || at > prev) lastSaleByProduct.set(productId, at);
  }

  for (const order of ordersResult.data ?? []) {
    const at = String((order as { created_at?: string }).created_at ?? "");
    const items = (order as { items?: { product_id?: string }[] }).items;
    if (!at || !Array.isArray(items)) continue;
    for (const item of items) {
      const productId = String(item.product_id ?? "");
      if (!productId) continue;
      const prev = lastSaleByProduct.get(productId);
      if (!prev || at > prev) lastSaleByProduct.set(productId, at);
    }
  }

  const candidates: StagnantProductCandidate[] = [];

  for (const row of rows) {
    const availableStock = resolveAvailableStock(row);
    if (availableStock <= 0) continue;

    const lastSaleAt = lastSaleByProduct.get(row.id) ?? null;
    const anchor = lastSaleAt ?? row.created_at;
    const daysWithoutSale = daysBetween(anchor);
    if (daysWithoutSale < minDays) continue;

    candidates.push({
      productId: row.id,
      productName: row.name,
      availableStock,
      priceUsd: resolvePriceUsd(row),
      daysWithoutSale,
      lastSaleAt,
      createdAt: row.created_at,
      isFeatured: Boolean(row.is_featured),
      thumbUrl: pickThumb(row.product_images),
    });
  }

  return candidates
    .sort((a, b) => {
      if (b.daysWithoutSale !== a.daysWithoutSale) {
        return b.daysWithoutSale - a.daysWithoutSale;
      }
      return b.availableStock - a.availableStock;
    })
    .slice(0, limit);
}
