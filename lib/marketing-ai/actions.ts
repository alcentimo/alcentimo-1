"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { createCoupon } from "@/lib/coupons/actions";
import { createPromotion } from "@/lib/promotions/actions";
import { endDateFromDaysValid } from "@/lib/marketing-ai/generate-recommendations";
import {
  listPendingMarketingSuggestions,
  runMarketingAiScanForStore,
} from "@/lib/marketing-ai/run-scan";
import type {
  ComboBundlePayload,
  CustomerPromoPayload,
  FixedCouponPayload,
  MarketingAiSuggestionRow,
  PercentCouponPayload,
} from "@/lib/marketing-ai/types";

export type MarketingSuggestionActionResult = {
  error?: string;
  success?: boolean;
  created?: number;
  suggestions?: MarketingAiSuggestionRow[];
};

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getPendingMarketingSuggestionsAction(): Promise<MarketingSuggestionActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  try {
    const suggestions = await listPendingMarketingSuggestions(
      supabase,
      auth.store.id,
    );
    return { success: true, suggestions };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudieron cargar.",
    };
  }
}

export async function refreshMarketingAiSuggestionsAction(): Promise<MarketingSuggestionActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const result = await runMarketingAiScanForStore(supabase, {
    storeId: auth.store.id,
    storeSlug: auth.store.slug,
    storeName: auth.store.name,
    storeRubro: auth.store.rubro_tienda ?? null,
  });

  if (result.error) {
    return { error: result.error };
  }

  const suggestions = await listPendingMarketingSuggestions(
    supabase,
    auth.store.id,
  );

  revalidatePath("/dashboard/promociones");
  revalidatePath("/dashboard/asistente");
  revalidatePath("/dashboard/ajustes");

  return { success: true, created: result.created, suggestions };
}

export async function dismissMarketingSuggestionAction(
  suggestionId: string,
): Promise<MarketingSuggestionActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("marketing_ai_suggestions")
    .update({
      status: "dismissed",
      dismissed_at: now,
      updated_at: now,
    } as never)
    .eq("id", suggestionId)
    .eq("store_id", auth.store.id)
    .eq("status", "pending");

  if (error) return { error: error.message };

  revalidatePath("/dashboard/promociones");
  revalidatePath("/dashboard/asistente");
  return { success: true };
}

export async function applyMarketingSuggestionAction(
  suggestionId: string,
): Promise<MarketingSuggestionActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const { data: row, error: loadError } = await supabase
    .from("marketing_ai_suggestions")
    .select("*")
    .eq("id", suggestionId)
    .eq("store_id", auth.store.id)
    .eq("status", "pending")
    .maybeSingle();

  if (loadError) return { error: loadError.message };
  if (!row) return { error: "Sugerencia no encontrada o ya procesada." };

  const suggestion = row as MarketingAiSuggestionRow;
  const payload = suggestion.action_payload;
  let createResult: { error?: string; success?: boolean };

  if (suggestion.suggestion_type === "create_customer_promo") {
    const p = payload as CustomerPromoPayload;
    createResult = await createPromotion({
      name: p.name,
      code: p.code,
      discountPercentage: p.discountPercentage,
      startDate: todayInputValue(),
      endDate: endDateFromDaysValid(p.daysValid),
      autoApply: p.autoApply,
      maxUses: p.maxUses,
    });
  } else if (suggestion.suggestion_type === "create_fixed_coupon") {
    const p = payload as FixedCouponPayload;
    createResult = await createCoupon({
      code: p.code,
      discountType: "fixed",
      discountFixedUsd: p.discountFixedUsd,
      maxUses: p.maxUses,
      startDate: todayInputValue(),
      endDate: endDateFromDaysValid(p.daysValid),
      isGlobal: p.isGlobal !== false,
      productIds: p.productIds ?? [],
    });
  } else {
    // create_percent_coupon | combo_bundle
    const p = payload as PercentCouponPayload | ComboBundlePayload;
    const productIds =
      "productIds" in p && Array.isArray(p.productIds) ? p.productIds : [];
    const isGlobal =
      suggestion.suggestion_type === "combo_bundle"
        ? false
        : (p as PercentCouponPayload).isGlobal !== false;

    createResult = await createCoupon({
      code: p.code,
      discountType: "percent",
      discountPercent: p.discountPercent,
      maxUses: p.maxUses,
      startDate: todayInputValue(),
      endDate: endDateFromDaysValid(p.daysValid),
      isGlobal,
      productIds,
    });
  }

  if (createResult.error) {
    return { error: createResult.error };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("marketing_ai_suggestions")
    .update({
      status: "applied",
      applied_at: now,
      updated_at: now,
    } as never)
    .eq("id", suggestionId)
    .eq("store_id", auth.store.id);

  if (updateError) return { error: updateError.message };

  revalidatePath("/dashboard/promociones");
  revalidatePath("/dashboard/asistente");
  revalidatePath("/dashboard/ajustes");
  revalidatePath(`/c/${auth.store.slug}`);

  return { success: true };
}
