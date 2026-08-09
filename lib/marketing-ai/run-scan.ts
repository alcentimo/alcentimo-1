import type { SupabaseClient } from "@supabase/supabase-js";
import { getMarketingAiContext } from "@/lib/marketing-ai/get-marketing-context";
import { generateMarketingRecommendationsWithAi } from "@/lib/marketing-ai/generate-recommendations";
import {
  MAX_MARKETING_SUGGESTIONS_PER_STORE,
  type MarketingAiSuggestionRow,
  type MarketingSuggestionType,
} from "@/lib/marketing-ai/types";

export interface RunMarketingAiScanResult {
  storeId: string;
  created: number;
  skipped: number;
  error?: string;
}

function asSuggestionRow(raw: unknown): MarketingAiSuggestionRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.store_id !== "string") {
    return null;
  }
  return raw as MarketingAiSuggestionRow;
}

export async function listPendingMarketingSuggestions(
  supabase: SupabaseClient,
  storeId: string,
): Promise<MarketingAiSuggestionRow[]> {
  const { data, error } = await supabase
    .from("marketing_ai_suggestions")
    .select("*")
    .eq("store_id", storeId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(MAX_MARKETING_SUGGESTIONS_PER_STORE);

  if (error) throw new Error(error.message);
  return (data ?? [])
    .map(asSuggestionRow)
    .filter((row): row is MarketingAiSuggestionRow => Boolean(row));
}

export async function runMarketingAiScanForStore(
  supabase: SupabaseClient,
  input: {
    storeId: string;
    storeSlug: string;
    storeName: string;
    storeRubro: string | null;
  },
): Promise<RunMarketingAiScanResult> {
  try {
    const { data: pendingRows, error: pendingError } = await supabase
      .from("marketing_ai_suggestions")
      .select("suggestion_type")
      .eq("store_id", input.storeId)
      .eq("status", "pending");

    if (pendingError) {
      return {
        storeId: input.storeId,
        created: 0,
        skipped: 0,
        error: pendingError.message,
      };
    }

    const pendingTypes = new Set(
      (pendingRows ?? []).map((row) => String(row.suggestion_type)),
    );

    if (pendingTypes.size >= MAX_MARKETING_SUGGESTIONS_PER_STORE) {
      return {
        storeId: input.storeId,
        created: 0,
        skipped: pendingTypes.size,
      };
    }

    const context = await getMarketingAiContext(
      input.storeId,
      input.storeSlug,
      input.storeName,
      input.storeRubro,
      supabase,
    );

    const generated = await generateMarketingRecommendationsWithAi(context);
    const fresh = generated.filter(
      (item) => !pendingTypes.has(item.suggestionType),
    );

    if (fresh.length === 0) {
      return {
        storeId: input.storeId,
        created: 0,
        skipped: generated.length,
      };
    }

    const inserts = fresh.map((suggestion) => ({
      store_id: input.storeId,
      status: "pending" as const,
      suggestion_type: suggestion.suggestionType as MarketingSuggestionType,
      title: suggestion.title,
      rationale: suggestion.rationale,
      action_payload: suggestion.actionPayload,
    }));

    const { error: insertError } = await supabase
      .from("marketing_ai_suggestions")
      .insert(inserts as never);

    if (insertError) {
      return {
        storeId: input.storeId,
        created: 0,
        skipped: 0,
        error: insertError.message,
      };
    }

    return {
      storeId: input.storeId,
      created: inserts.length,
      skipped: generated.length - inserts.length,
    };
  } catch (error) {
    return {
      storeId: input.storeId,
      created: 0,
      skipped: 0,
      error: error instanceof Error ? error.message : "No se pudo analizar.",
    };
  }
}

export async function runMarketingAiScanAllStores(
  admin: SupabaseClient,
): Promise<{ scanned: number; results: RunMarketingAiScanResult[] }> {
  const { data: stores, error } = await admin
    .from("stores")
    .select("id, slug, name, rubro_tienda")
    .eq("is_active", true)
    .limit(80);

  if (error) {
    throw new Error(error.message);
  }

  const results: RunMarketingAiScanResult[] = [];
  for (const store of stores ?? []) {
    const result = await runMarketingAiScanForStore(admin, {
      storeId: String(store.id),
      storeSlug: String(store.slug),
      storeName: String(store.name),
      storeRubro: (store.rubro_tienda as string | null) ?? null,
    });
    results.push(result);
  }

  return { scanned: results.length, results };
}
