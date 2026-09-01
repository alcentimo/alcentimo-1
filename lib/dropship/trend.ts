import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllPagedRows } from "@/lib/supabase/fetch-all-rows";

const IMPORTER_WEIGHT = 10;
const UNIT_SOLD_WEIGHT = 3;

export type SupplierTrendScoreMap = Record<string, number>;

function bump(scores: SupplierTrendScoreMap, id: string, amount: number) {
  if (!id || amount === 0) return;
  scores[id] = (scores[id] ?? 0) + amount;
}

async function loadSupplierTrendScoresUncached(): Promise<SupplierTrendScoreMap> {
  const scores: SupplierTrendScoreMap = {};
  const admin = createAdminClient();

  const linksResult = await fetchAllPagedRows((from, to) =>
    admin
      .from("store_dropship_links")
      .select("supplier_product_id")
      .order("supplier_product_id", { ascending: true })
      .range(from, to),
  );

  if (!linksResult.error) {
    for (const row of linksResult.rows) {
      const id = String(row.supplier_product_id ?? "");
      bump(scores, id, IMPORTER_WEIGHT);
    }
  }

  try {
    const holdsResult = await fetchAllPagedRows((from, to) =>
      admin
        .from("dropship_stock_holds")
        .select("supplier_product_id, quantity")
        .eq("status", "committed")
        .order("supplier_product_id", { ascending: true })
        .range(from, to),
    );
    if (!holdsResult.error) {
      for (const row of holdsResult.rows) {
        const id = String(row.supplier_product_id ?? "");
        const qty = Math.max(0, Number(row.quantity) || 0);
        bump(scores, id, qty * UNIT_SOLD_WEIGHT);
      }
    }
  } catch {
    // Tabla ausente en entornos pre-migración: la adopción basta.
  }

  return scores;
}

const getCachedSupplierTrendScores = unstable_cache(
  async () => loadSupplierTrendScoresUncached(),
  ["supplier-hub-trend-scores-v1"],
  { revalidate: 60 },
);

export async function getSupplierTrendScores(): Promise<Map<string, number>> {
  const record = await getCachedSupplierTrendScores();
  return new Map(Object.entries(record));
}

export function trendScoreOf(
  scores: Map<string, number> | SupplierTrendScoreMap,
  supplierProductId: string,
): number {
  if (scores instanceof Map) {
    return scores.get(supplierProductId) ?? 0;
  }
  return scores[supplierProductId] ?? 0;
}

export function compareByHubTrend<T>(
  a: T,
  b: T,
  getScore: (item: T) => number,
  getTiebreak: (item: T) => string,
): number {
  const scoreDelta = getScore(b) - getScore(a);
  if (scoreDelta !== 0) return scoreDelta;
  return getTiebreak(a).localeCompare(getTiebreak(b), "es");
}

export function isHotTrendScore(score: number, maxScore: number): boolean {
  if (score <= 0) return false;
  if (maxScore <= 0) return false;
  return score >= Math.max(IMPORTER_WEIGHT, maxScore * 0.35);
}
