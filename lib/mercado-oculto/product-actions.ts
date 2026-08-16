"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getCachedMercadoCatalog,
  getCachedOfficialMayoristaUserIds,
  SUPPLIER_PRODUCT_SELECT,
} from "@/lib/mercado-oculto/catalog-cache";
import { filterMercadoProducts } from "@/lib/mercado-oculto/filter-catalog";
import { MORICHE_BRAND_LABEL } from "@/lib/mercado-oculto/access";
import { mapSupplierRowToMercadoCard, type MercadoProductCard } from "@/lib/mercado-oculto/types";

type ActionResult<T extends object = object> = {
  error?: string;
} & Partial<T>;

export async function listOfficialMayoristaUserIds(): Promise<string[]> {
  return getCachedOfficialMayoristaUserIds();
}

export type ListMercadoProductsInput = {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  supplierUserId?: string;
  freeShippingOnly?: boolean;
  limit?: number;
};

/** Vitrina B2B pública: catálogo cacheado (sin sesión). */
export async function listMercadoProducts(
  options?: ListMercadoProductsInput,
): Promise<
  ActionResult<{
    products: MercadoProductCard[];
    facets: Awaited<ReturnType<typeof getCachedMercadoCatalog>>["facets"];
  }>
> {
  try {
    const catalog = await getCachedMercadoCatalog();
    const filtered = filterMercadoProducts(catalog.products, {
      q: options?.query?.trim() ?? "",
      category: options?.category?.trim() ?? "",
      min:
        typeof options?.minPrice === "number" && Number.isFinite(options.minPrice)
          ? String(options.minPrice)
          : "",
      max:
        typeof options?.maxPrice === "number" && Number.isFinite(options.maxPrice)
          ? String(options.maxPrice)
          : "",
      supplier: options?.supplierUserId?.trim() ?? "",
      ship: options?.freeShippingOnly ? "free" : "",
    });

    const limit = Math.min(Math.max(options?.limit ?? 96, 1), 160);
    return {
      products: filtered.slice(0, limit),
      facets: catalog.facets,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No se pudo cargar el catálogo.",
    };
  }
}

/** Detalle público de un producto de la vitrina Moriche. */
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

  // Prefer cache hit for fast back/forward navigation.
  try {
    const catalog = await getCachedMercadoCatalog();
    const cached = catalog.products.find(
      (item) => item.product_id === productId,
    );
    if (cached) {
      return {
        product: cached,
        sellerUserId: cached.seller_user_id,
        sellerStoreName: cached.supplier_label,
      };
    }
  } catch {
    // Fall through to direct fetch.
  }

  const creatorIds = await getCachedOfficialMayoristaUserIds();
  if (creatorIds.length === 0) {
    return { error: "No hay cuentas mayoristas oficiales configuradas." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("supplier_products")
    .select(SUPPLIER_PRODUCT_SELECT)
    .eq("id", productId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Producto no encontrado o inactivo." };

  const row = data as Record<string, unknown>;
  const createdBy = String(row.created_by ?? "");
  if (!creatorIds.includes(createdBy)) {
    return {
      error:
        "Este producto no pertenece al catálogo de Mercado Moriche.",
    };
  }

  const product = mapSupplierRowToMercadoCard(row, MORICHE_BRAND_LABEL);
  return {
    product,
    sellerUserId: product.seller_user_id,
    sellerStoreName: MORICHE_BRAND_LABEL,
  };
}
