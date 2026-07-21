"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import {
  MAX_STORE_LOCATIONS,
  mapStoreLocationRow,
  type StoreLocation,
} from "@/lib/locations/types";
import { getStoreLocations } from "@/lib/locations/get-store-locations";

export interface LocationActionResult {
  error?: string;
  location?: StoreLocation;
  locations?: StoreLocation[];
}

function normalizeText(value: unknown, max = 200): string {
  return String(value ?? "").trim().slice(0, max);
}

function normalizePhone(value: unknown): string | null {
  const phone = normalizeText(value, 40);
  return phone || null;
}

export async function listStoreLocationsAction(): Promise<LocationActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  try {
    const locations = await getStoreLocations(auth.store.id);
    return { locations };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudieron cargar sucursales.",
    };
  }
}

export async function createStoreLocationAction(input: {
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  isActive?: boolean;
}): Promise<LocationActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const name = normalizeText(input.name, 80);
  if (!name) return { error: "Indica el nombre de la sucursal." };

  const existing = await getStoreLocations(auth.store.id);
  if (existing.length >= MAX_STORE_LOCATIONS) {
    return { error: `Máximo ${MAX_STORE_LOCATIONS} sucursales por tienda.` };
  }

  const { data, error } = await supabase
    .from("store_locations")
    .insert({
      store_id: auth.store.id,
      name,
      address: normalizeText(input.address, 240),
      city: normalizeText(input.city, 80),
      phone: normalizePhone(input.phone),
      is_active: input.isActive !== false,
      is_default: existing.length === 0,
      sort_order: existing.length,
    })
    .select(
      "id, store_id, name, address, city, phone, is_active, is_default, sort_order, created_at, updated_at",
    )
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard/ajustes");
  revalidatePath("/dashboard/catalogo");
  revalidatePath(`/c/${auth.store.slug}`);

  return { location: mapStoreLocationRow(data as Record<string, unknown>) };
}

export async function updateStoreLocationAction(input: {
  locationId: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  isActive?: boolean;
}): Promise<LocationActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const name = normalizeText(input.name, 80);
  if (!name) return { error: "Indica el nombre de la sucursal." };

  const { data: existing, error: lookupError } = await supabase
    .from("store_locations")
    .select("id, is_default")
    .eq("id", input.locationId)
    .eq("store_id", auth.store.id)
    .maybeSingle();

  if (lookupError) return { error: lookupError.message };
  if (!existing) return { error: "Sucursal no encontrada." };

  if (input.isActive === false && existing.is_default) {
    return { error: "No puedes desactivar la sucursal principal. Asigna otra como principal primero." };
  }

  const { data, error } = await supabase
    .from("store_locations")
    .update({
      name,
      address: normalizeText(input.address, 240),
      city: normalizeText(input.city, 80),
      phone: normalizePhone(input.phone),
      is_active: input.isActive !== false,
    })
    .eq("id", input.locationId)
    .eq("store_id", auth.store.id)
    .select(
      "id, store_id, name, address, city, phone, is_active, is_default, sort_order, created_at, updated_at",
    )
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard/ajustes");
  revalidatePath(`/c/${auth.store.slug}`);

  return { location: mapStoreLocationRow(data as Record<string, unknown>) };
}

export async function setDefaultStoreLocationAction(
  locationId: string,
): Promise<LocationActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const { data: target, error: lookupError } = await supabase
    .from("store_locations")
    .select("id, is_active")
    .eq("id", locationId)
    .eq("store_id", auth.store.id)
    .maybeSingle();

  if (lookupError) return { error: lookupError.message };
  if (!target) return { error: "Sucursal no encontrada." };
  if (!target.is_active) {
    return { error: "Activa la sucursal antes de marcarla como principal." };
  }

  await supabase
    .from("store_locations")
    .update({ is_default: false })
    .eq("store_id", auth.store.id)
    .neq("id", locationId);

  const { error } = await supabase
    .from("store_locations")
    .update({ is_default: true, is_active: true })
    .eq("id", locationId)
    .eq("store_id", auth.store.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/ajustes");
  return {};
}

export async function deleteStoreLocationAction(
  locationId: string,
): Promise<LocationActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const locations = await getStoreLocations(auth.store.id);
  const target = locations.find((loc) => loc.id === locationId);
  if (!target) return { error: "Sucursal no encontrada." };
  if (locations.length <= 1) {
    return { error: "Debes conservar al menos una sucursal." };
  }
  if (target.is_default) {
    return { error: "Asigna otra sucursal como principal antes de eliminar esta." };
  }

  const { error } = await supabase
    .from("store_locations")
    .delete()
    .eq("id", locationId)
    .eq("store_id", auth.store.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/ajustes");
  revalidatePath("/dashboard/catalogo");
  revalidatePath(`/c/${auth.store.slug}`);

  return {};
}

/** Escribe stock por sede y deja que el trigger sincronice el total de la variante. */
export async function setVariantLocationStockAction(input: {
  variantId: string;
  locationStocks: Array<{ locationId: string; stockQuantity: number }>;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .select("id, product_id, products!inner(store_id)")
    .eq("id", input.variantId)
    .maybeSingle();

  if (variantError) return { error: variantError.message };
  if (!variant) return { error: "Variante no encontrada." };

  const storeId = (variant.products as { store_id?: string } | null)?.store_id;
  if (storeId !== auth.store.id) {
    return { error: "No tienes permiso para editar este producto." };
  }

  for (const row of input.locationStocks) {
    const qty = Math.max(0, Math.floor(Number(row.stockQuantity) || 0));
    const { data: existing } = await supabase
      .from("variant_location_stock")
      .select("reserved_quantity")
      .eq("variant_id", input.variantId)
      .eq("location_id", row.locationId)
      .maybeSingle();

    const reserved = Math.min(Number(existing?.reserved_quantity ?? 0), qty);

    const { error } = await supabase.from("variant_location_stock").upsert(
      {
        variant_id: input.variantId,
        location_id: row.locationId,
        stock_quantity: qty,
        reserved_quantity: reserved,
      },
      { onConflict: "variant_id,location_id" },
    );

    if (error) return { error: error.message };
  }

  revalidatePath("/dashboard/catalogo");
  revalidatePath(`/c/${auth.store.slug}`);
  return {};
}
