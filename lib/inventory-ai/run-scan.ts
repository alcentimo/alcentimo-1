import type { SupabaseClient } from "@supabase/supabase-js";
import { findStagnantProductsForStore } from "@/lib/inventory-ai/find-stagnant-products";
import { generateInventorySuggestionsWithAi } from "@/lib/inventory-ai/generate-suggestions";
import {
  MAX_SUGGESTIONS_PER_STORE,
  STAGNANT_SOFT_DAYS,
  type InventoryAiSuggestionRow,
} from "@/lib/inventory-ai/types";

export interface RunInventoryAiScanResult {
  storeId: string;
  candidates: number;
  created: number;
  skipped: number;
  error?: string;
}

function asSuggestionRow(raw: unknown): InventoryAiSuggestionRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.store_id !== "string") {
    return null;
  }
  return raw as InventoryAiSuggestionRow;
}

/** Escanea una tienda y crea sugerencias pendientes (sin duplicar). */
export async function runInventoryAiScanForStore(
  supabase: SupabaseClient,
  input: { storeId: string; storeName: string },
): Promise<RunInventoryAiScanResult> {
  try {
    const candidates = await findStagnantProductsForStore(
      supabase,
      input.storeId,
      { minDays: STAGNANT_SOFT_DAYS, limit: MAX_SUGGESTIONS_PER_STORE * 2 },
    );

    if (candidates.length === 0) {
      return {
        storeId: input.storeId,
        candidates: 0,
        created: 0,
        skipped: 0,
      };
    }

    const { data: pendingRows, error: pendingError } = await supabase
      .from("inventory_ai_suggestions")
      .select("product_id")
      .eq("store_id", input.storeId)
      .eq("status", "pending");

    if (pendingError) {
      return {
        storeId: input.storeId,
        candidates: candidates.length,
        created: 0,
        skipped: 0,
        error: pendingError.message,
      };
    }

    const pendingIds = new Set(
      (pendingRows ?? []).map((row) => String(row.product_id)),
    );

    const fresh = candidates
      .filter((c) => !pendingIds.has(c.productId))
      .slice(0, MAX_SUGGESTIONS_PER_STORE);

    if (fresh.length === 0) {
      return {
        storeId: input.storeId,
        candidates: candidates.length,
        created: 0,
        skipped: candidates.length,
      };
    }

    const generated = await generateInventorySuggestionsWithAi({
      storeName: input.storeName,
      products: fresh,
    });

    const byProduct = new Map(fresh.map((p) => [p.productId, p]));
    const inserts = [];
    for (const suggestion of generated) {
      const product = byProduct.get(suggestion.productId);
      if (!product) continue;
      inserts.push({
        store_id: input.storeId,
        product_id: suggestion.productId,
        status: "pending" as const,
        days_without_sale: product.daysWithoutSale,
        available_stock: product.availableStock,
        current_price_usd: product.priceUsd,
        suggestion_type: suggestion.suggestionType,
        title: suggestion.title,
        rationale: suggestion.rationale,
        action_payload: suggestion.actionPayload,
        updated_at: new Date().toISOString(),
      });
    }

    if (inserts.length === 0) {
      return {
        storeId: input.storeId,
        candidates: candidates.length,
        created: 0,
        skipped: candidates.length,
      };
    }

    const { error: insertError } = await supabase
      .from("inventory_ai_suggestions")
      .insert(inserts);

    if (insertError) {
      return {
        storeId: input.storeId,
        candidates: candidates.length,
        created: 0,
        skipped: 0,
        error: insertError.message,
      };
    }

    return {
      storeId: input.storeId,
      candidates: candidates.length,
      created: inserts.length,
      skipped: candidates.length - inserts.length,
    };
  } catch (error) {
    return {
      storeId: input.storeId,
      candidates: 0,
      created: 0,
      skipped: 0,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/** Escanea todas las tiendas activas (cron). */
export async function runInventoryAiScanAllStores(
  supabase: SupabaseClient,
  options?: { storeLimit?: number },
): Promise<{ results: RunInventoryAiScanResult[]; scanned: number }> {
  const storeLimit = options?.storeLimit ?? 80;

  const { data: stores, error } = await supabase
    .from("stores")
    .select("id, name")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(storeLimit);

  if (error) {
    throw new Error(error.message);
  }

  const results: RunInventoryAiScanResult[] = [];
  for (const store of stores ?? []) {
    const result = await runInventoryAiScanForStore(supabase, {
      storeId: store.id,
      storeName: store.name ?? "Tienda",
    });
    results.push(result);
  }

  return { results, scanned: results.length };
}

export async function listPendingInventorySuggestions(
  supabase: SupabaseClient,
  storeId: string,
  limit = 8,
): Promise<InventoryAiSuggestionRow[]> {
  const { data, error } = await supabase
    .from("inventory_ai_suggestions")
    .select("*")
    .eq("store_id", storeId)
    .eq("status", "pending")
    .order("days_without_sale", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map(asSuggestionRow)
    .filter((row): row is InventoryAiSuggestionRow => row != null);
}
