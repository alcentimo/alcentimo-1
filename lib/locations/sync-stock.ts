import type { SupabaseClient } from "@supabase/supabase-js";

/** Escribe stock en una sede; el trigger sincroniza el total de la variante. */
export async function upsertVariantLocationStock(
  supabase: SupabaseClient,
  options: {
    variantId: string;
    locationId: string;
    stockQuantity: number;
  },
): Promise<{ error?: string }> {
  const qty = Math.max(0, Math.floor(options.stockQuantity));

  const { data: existing } = await supabase
    .from("variant_location_stock")
    .select("reserved_quantity")
    .eq("variant_id", options.variantId)
    .eq("location_id", options.locationId)
    .maybeSingle();

  const reserved = Math.min(Number(existing?.reserved_quantity ?? 0), qty);

  const { error } = await supabase.from("variant_location_stock").upsert(
    {
      variant_id: options.variantId,
      location_id: options.locationId,
      stock_quantity: qty,
      reserved_quantity: reserved,
    },
    { onConflict: "variant_id,location_id" },
  );

  if (error) return { error: error.message };
  return {};
}

export async function getDefaultLocationId(
  supabase: SupabaseClient,
  storeId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("store_locations")
    .select("id")
    .eq("store_id", storeId)
    .eq("is_default", true)
    .maybeSingle();

  if (error || !data) {
    const { data: fallback } = await supabase
      .from("store_locations")
      .select("id")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    return (fallback?.id as string | undefined) ?? null;
  }

  return data.id as string;
}

/** Tras crear/editar producto con stock único: aplica a la sede principal. */
export async function syncDefaultLocationStockFromVariant(
  supabase: SupabaseClient,
  storeId: string,
  variantId: string,
  stockQuantity: number,
): Promise<{ error?: string }> {
  const locationId = await getDefaultLocationId(supabase, storeId);
  if (!locationId) return {};

  return upsertVariantLocationStock(supabase, {
    variantId,
    locationId,
    stockQuantity,
  });
}

export async function applyLocationStocksFromForm(
  supabase: SupabaseClient,
  storeId: string,
  variantId: string,
  formData: FormData,
  fallbackStock: number,
): Promise<{ error?: string }> {
  const raw = String(formData.get("location_stocks_json") ?? "").trim();
  if (!raw) {
    return syncDefaultLocationStockFromVariant(
      supabase,
      storeId,
      variantId,
      fallbackStock,
    );
  }

  try {
    const parsed = JSON.parse(raw) as Array<{
      locationId?: string;
      stockQuantity?: number;
    }>;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return syncDefaultLocationStockFromVariant(
        supabase,
        storeId,
        variantId,
        fallbackStock,
      );
    }

    for (const row of parsed) {
      if (!row.locationId) continue;
      const result = await upsertVariantLocationStock(supabase, {
        variantId,
        locationId: row.locationId,
        stockQuantity: Number(row.stockQuantity ?? 0),
      });
      if (result.error) return result;
    }
    return {};
  } catch {
    return syncDefaultLocationStockFromVariant(
      supabase,
      storeId,
      variantId,
      fallbackStock,
    );
  }
}
