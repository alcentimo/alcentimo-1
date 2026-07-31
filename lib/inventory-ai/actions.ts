"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import {
  listPendingInventorySuggestions,
  runInventoryAiScanForStore,
} from "@/lib/inventory-ai/run-scan";
import type {
  DiscountOfferPayload,
  FeaturePayload,
  InventoryAiSuggestionRow,
} from "@/lib/inventory-ai/types";

export type InventorySuggestionActionResult = {
  error?: string;
  success?: boolean;
  created?: number;
  suggestions?: InventoryAiSuggestionRow[];
};

function isDiscountPayload(
  payload: InventoryAiSuggestionRow["action_payload"],
): payload is DiscountOfferPayload {
  return (
    typeof payload === "object" &&
    payload != null &&
    "suggestedPriceUsd" in payload &&
    "compareAtUsd" in payload
  );
}

function isFeaturePayload(
  payload: InventoryAiSuggestionRow["action_payload"],
): payload is FeaturePayload {
  return (
    typeof payload === "object" &&
    payload != null &&
    "setFeatured" in payload &&
    (payload as FeaturePayload).setFeatured === true
  );
}

export async function getPendingInventorySuggestionsAction(): Promise<InventorySuggestionActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  try {
    const suggestions = await listPendingInventorySuggestions(
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

/** Dispara análisis de la tienda actual (útil si el cron aún no corrió). */
export async function refreshInventoryAiSuggestionsAction(): Promise<InventorySuggestionActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const result = await runInventoryAiScanForStore(supabase, {
    storeId: auth.store.id,
    storeName: auth.store.name,
  });

  if (result.error) {
    return { error: result.error };
  }

  const suggestions = await listPendingInventorySuggestions(
    supabase,
    auth.store.id,
  );

  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/asistente");

  return { success: true, created: result.created, suggestions };
}

export async function dismissInventorySuggestionAction(
  suggestionId: string,
): Promise<InventorySuggestionActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("inventory_ai_suggestions")
    .update({
      status: "dismissed",
      dismissed_at: now,
      updated_at: now,
    })
    .eq("id", suggestionId)
    .eq("store_id", auth.store.id)
    .eq("status", "pending");

  if (error) return { error: error.message };

  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/asistente");
  return { success: true };
}

export async function applyInventorySuggestionAction(
  suggestionId: string,
): Promise<InventorySuggestionActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const { data: suggestion, error: loadError } = await supabase
    .from("inventory_ai_suggestions")
    .select("*")
    .eq("id", suggestionId)
    .eq("store_id", auth.store.id)
    .eq("status", "pending")
    .maybeSingle();

  if (loadError) return { error: loadError.message };
  if (!suggestion) return { error: "Sugerencia no encontrada o ya atendida." };

  const row = suggestion as InventoryAiSuggestionRow;
  const productId = row.product_id;

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("store_id", auth.store.id)
    .eq("is_deleted", false)
    .maybeSingle();

  if (productError) return { error: productError.message };
  if (!product) return { error: "El producto ya no está disponible." };

  if (
    row.suggestion_type === "discount_offer" ||
    row.suggestion_type === "review_price"
  ) {
    if (!isDiscountPayload(row.action_payload)) {
      return { error: "La sugerencia no tiene un descuento válido." };
    }

    const payload = row.action_payload;
    if (
      !Number.isFinite(payload.suggestedPriceUsd) ||
      payload.suggestedPriceUsd < 0
    ) {
      return { error: "Precio sugerido inválido." };
    }

    const { data: variant, error: variantError } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", productId)
      .eq("is_default", true)
      .eq("is_active", true)
      .maybeSingle();

    if (variantError) return { error: variantError.message };

    let variantId = variant?.id as string | undefined;
    if (!variantId) {
      const { data: anyVariant, error: anyVariantError } = await supabase
        .from("product_variants")
        .select("id")
        .eq("product_id", productId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (anyVariantError) return { error: anyVariantError.message };
      variantId = anyVariant?.id;
    }

    if (!variantId) {
      return { error: "No hay variante activa para actualizar el precio." };
    }

    const { data: existingPrice, error: priceLookupError } = await supabase
      .from("product_prices")
      .select("id, amount_usd, compare_at_usd")
      .eq("variant_id", variantId)
      .maybeSingle();

    if (priceLookupError) return { error: priceLookupError.message };

    const compareAt =
      existingPrice?.compare_at_usd != null
        ? Number(existingPrice.compare_at_usd)
        : payload.compareAtUsd || Number(existingPrice?.amount_usd ?? 0);

    const priceUpdate = {
      amount_usd: payload.suggestedPriceUsd,
      compare_at_usd:
        compareAt > payload.suggestedPriceUsd
          ? compareAt
          : payload.compareAtUsd || payload.currentPriceUsd,
    };

    const { error: priceError } = existingPrice
      ? await supabase
          .from("product_prices")
          .update(priceUpdate)
          .eq("variant_id", variantId)
      : await supabase.from("product_prices").insert({
          variant_id: variantId,
          ...priceUpdate,
        });

    if (priceError) return { error: priceError.message };
  } else if (row.suggestion_type === "feature") {
    if (!isFeaturePayload(row.action_payload)) {
      return { error: "La sugerencia de destacado no es válida." };
    }

    const { error: featureError } = await supabase
      .from("products")
      .update({ is_featured: true })
      .eq("id", productId)
      .eq("store_id", auth.store.id);

    if (featureError) return { error: featureError.message };
  } else {
    return { error: "Tipo de sugerencia no soportado." };
  }

  const now = new Date().toISOString();
  const { error: markError } = await supabase
    .from("inventory_ai_suggestions")
    .update({
      status: "applied",
      applied_at: now,
      updated_at: now,
    })
    .eq("id", suggestionId)
    .eq("store_id", auth.store.id);

  if (markError) return { error: markError.message };

  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/asistente");
  revalidatePath("/dashboard/inventario");

  return { success: true };
}
