"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  isPaidSubscriberProfile,
  mapMercadoProductCard,
  MERCADO_CATALOG_SELECT,
  type MercadoProductCard,
} from "@/lib/mercado-oculto/types";
import type { CatalogListItem } from "@/lib/database.types";

type ActionResult<T extends object = object> = {
  error?: string;
} & Partial<T>;

/** Tiendas cuyo dueño tiene suscripción de pago (active/provisional). */
export async function listPaidSubscriberStoreIds(): Promise<string[]> {
  const admin = createAdminClient();
  const { data: stores, error } = await admin
    .from("stores")
    .select("id, owner_id, is_active")
    .eq("is_active", true);

  if (error || !stores?.length) return [];

  const ownerIds = [
    ...new Set(
      (stores as Array<{ owner_id: string }>).map((row) => row.owner_id),
    ),
  ];

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, plan, subscription_status")
    .in("id", ownerIds);

  if (profilesError || !profiles?.length) return [];

  const paidOwners = new Set(
    (
      profiles as Array<{
        id: string;
        plan?: string | null;
        subscription_status?: string | null;
      }>
    )
      .filter(isPaidSubscriberProfile)
      .map((row) => row.id),
  );

  return (stores as Array<{ id: string; owner_id: string }>)
    .filter((store) => paidOwners.has(store.owner_id))
    .map((store) => store.id);
}

/** Listado público de la vitrina (sin login). */
export async function listMercadoProducts(options?: {
  query?: string;
  limit?: number;
}): Promise<ActionResult<{ products: MercadoProductCard[] }>> {
  const storeIds = await listPaidSubscriberStoreIds();
  if (storeIds.length === 0) {
    return { products: [] };
  }

  const limit = Math.min(Math.max(options?.limit ?? 60, 1), 120);
  const admin = createAdminClient();
  let request = admin
    .from("catalog_list_view")
    .select(MERCADO_CATALOG_SELECT)
    .in("store_id", storeIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  const q = options?.query?.trim();
  if (q) {
    const safe = q.replace(/[%_,]/g, " ").slice(0, 80);
    if (safe) {
      request = request.or(
        `product_name.ilike.%${safe}%,store_name.ilike.%${safe}%,category_name.ilike.%${safe}%`,
      );
    }
  }

  const { data, error } = await request;
  if (error) return { error: error.message };

  const products = ((data as unknown as CatalogListItem[]) ?? []).map(
    mapMercadoProductCard,
  );
  return { products };
}

/** Detalle público de un producto del mercado (sin login). */
export async function getMercadoProduct(
  productId: string,
): Promise<
  ActionResult<{
    product: MercadoProductCard;
    sellerUserId: string;
    sellerStoreName: string;
  }>
> {
  if (!productId.trim()) return { error: "Producto inválido." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("catalog_list_view")
    .select(MERCADO_CATALOG_SELECT)
    .eq("product_id", productId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Producto no encontrado o inactivo." };

  const product = mapMercadoProductCard(data as unknown as CatalogListItem);

  const { data: store, error: storeError } = await admin
    .from("stores")
    .select("id, owner_id, name, is_active")
    .eq("id", product.store_id)
    .maybeSingle();

  if (storeError) return { error: storeError.message };
  if (!store || !(store as { is_active?: boolean }).is_active) {
    return { error: "La tienda no está disponible." };
  }

  const ownerId = String((store as { owner_id: string }).owner_id);
  const { data: profile } = await admin
    .from("profiles")
    .select("id, plan, subscription_status")
    .eq("id", ownerId)
    .maybeSingle();

  if (
    !profile ||
    !isPaidSubscriberProfile(
      profile as {
        plan?: string | null;
        subscription_status?: string | null;
      },
    )
  ) {
    return {
      error:
        "Este producto ya no forma parte del mercado (suscripción del vendedor inactiva).",
    };
  }

  return {
    product,
    sellerUserId: ownerId,
    sellerStoreName: String((store as { name: string }).name),
  };
}
