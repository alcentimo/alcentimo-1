import { createClient } from "@/lib/supabase/server";
import { resolveActiveStoreBySlug } from "@/lib/customers/middleware-access";
import { buildCustomerRegisterPath } from "@/lib/customers/middleware-access";
import type { CatalogPromotionContext } from "@/lib/promotions/types";

function isPromotionInDateRange(
  startDate: string | null,
  endDate: string | null,
): boolean {
  const now = Date.now();
  if (startDate && new Date(startDate).getTime() > now) return false;
  if (endDate && new Date(endDate).getTime() < now) return false;
  return true;
}

function normalizePromotionRow(row: {
  name: string;
  discount_percentage: number | string;
  code: string;
  start_date: string | null;
  end_date: string;
  is_active: boolean;
  auto_apply: boolean;
  max_uses: number;
  use_count: number;
}) {
  const maxUses = Number(row.max_uses) || 0;
  const useCount = Number(row.use_count) || 0;
  if (maxUses > 0 && useCount >= maxUses) return null;
  if (!row.is_active) return null;
  if (!isPromotionInDateRange(row.start_date, row.end_date)) return null;

  return {
    name: row.name,
    code: row.code,
    discountPercent: Number(row.discount_percentage) || 0,
    autoApply: Boolean(row.auto_apply),
  };
}

/**
 * Consulta ligera (1 fila) para banner y auto-aplicación en catálogo.
 */
export async function getCatalogPromotionContext(
  storeSlug: string,
  isCustomer: boolean,
): Promise<CatalogPromotionContext> {
  const normalizedSlug = storeSlug.trim().toLowerCase();
  const supabase = await createClient();
  const store = await resolveActiveStoreBySlug(supabase, normalizedSlug);

  if (!store) {
    return { guestBanner: null, autoApply: null };
  }

  const { data, error } = await supabase
    .from("promotions")
    .select(
      "name, code, discount_percentage, start_date, end_date, is_active, auto_apply, max_uses, use_count",
    )
    .eq("store_id", store.id)
    .eq("is_active", true)
    .order("discount_percentage", { ascending: false })
    .limit(5);

  if (error) {
    console.error("[getCatalogPromotionContext]", error.message);
    return { guestBanner: null, autoApply: null };
  }

  const activePromotions = (data ?? [])
    .map((row) => normalizePromotionRow(row as Parameters<typeof normalizePromotionRow>[0]))
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const best = activePromotions[0] ?? null;
  if (!best) {
    return { guestBanner: null, autoApply: null };
  }

  const registerPath = buildCustomerRegisterPath(normalizedSlug, `/c/${normalizedSlug}`);

  return {
    guestBanner: isCustomer
      ? null
      : {
          name: best.name,
          discountPercent: best.discountPercent,
          registerPath,
        },
    autoApply:
      isCustomer && best.autoApply
        ? {
            code: best.code,
            name: best.name,
            discountPercent: best.discountPercent,
          }
        : null,
  };
}
