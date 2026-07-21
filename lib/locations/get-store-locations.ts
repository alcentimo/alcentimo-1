import { createClient } from "@/lib/supabase/server";
import { getPublicServerClient } from "@/lib/supabase/public-server";
import {
  availableFromLocationStock,
  mapStoreLocationRow,
  type StoreLocation,
  type VariantLocationStock,
} from "@/lib/locations/types";

const LOCATION_SELECT =
  "id, store_id, name, address, city, phone, is_active, is_default, sort_order, created_at, updated_at";

export async function getStoreLocations(
  storeId: string,
  options?: { activeOnly?: boolean },
): Promise<StoreLocation[]> {
  const supabase = await createClient();
  let query = supabase
    .from("store_locations")
    .select(LOCATION_SELECT)
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (options?.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapStoreLocationRow(row as Record<string, unknown>));
}

export async function getPublicStoreLocations(
  storeId: string,
): Promise<StoreLocation[]> {
  const client = getPublicServerClient();
  const { data, error } = await client
    .from("store_locations")
    .select(LOCATION_SELECT)
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapStoreLocationRow(row as Record<string, unknown>));
}

export async function getVariantLocationStocksForStore(
  storeId: string,
): Promise<VariantLocationStock[]> {
  const locations = await getPublicStoreLocations(storeId);
  if (locations.length === 0) return [];

  const client = getPublicServerClient();
  const locationIds = locations.map((loc) => loc.id);
  const { data: rows, error } = await client
    .from("variant_location_stock")
    .select("variant_id, location_id, stock_quantity, reserved_quantity")
    .in("location_id", locationIds);

  if (error) throw new Error(error.message);

  return (rows ?? []).map((row) => {
    const stock = Number(row.stock_quantity ?? 0);
    const reserved = Number(row.reserved_quantity ?? 0);
    return {
      variant_id: String(row.variant_id),
      location_id: String(row.location_id),
      stock_quantity: stock,
      reserved_quantity: reserved,
      available_stock: availableFromLocationStock({
        stock_quantity: stock,
        reserved_quantity: reserved,
      }),
    };
  });
}

export async function getProductLocationStocks(
  productId: string,
): Promise<
  Array<{
    variant_id: string;
    location_id: string;
    stock_quantity: number;
    reserved_quantity: number;
    available_stock: number;
  }>
> {
  const supabase = await createClient();
  const { data: variants, error: variantsError } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId);

  if (variantsError) throw new Error(variantsError.message);
  const variantIds = (variants ?? []).map((v) => v.id as string);
  if (variantIds.length === 0) return [];

  const { data, error } = await supabase
    .from("variant_location_stock")
    .select("variant_id, location_id, stock_quantity, reserved_quantity")
    .in("variant_id", variantIds);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const stock = Number(row.stock_quantity ?? 0);
    const reserved = Number(row.reserved_quantity ?? 0);
    return {
      variant_id: String(row.variant_id),
      location_id: String(row.location_id),
      stock_quantity: stock,
      reserved_quantity: reserved,
      available_stock: availableFromLocationStock({
        stock_quantity: stock,
        reserved_quantity: reserved,
      }),
    };
  });
}
