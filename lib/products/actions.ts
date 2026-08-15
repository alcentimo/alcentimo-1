"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore, requireAuthUser } from "@/lib/auth/require-dashboard-auth";
import { getStoreCatalogUrl, getUserStore } from "@/lib/stores";
import {
  allocateUniqueProductSlug,
  isProductSlugUniqueViolation,
  randomProductSlugSuffix,
} from "@/lib/products/allocate-product-slug";
import {
  STORE_SLUG_UNAVAILABLE_MESSAGE,
  validateStoreSlugCandidate,
} from "@/lib/stores/slug-availability";
import { scheduleStoreSubdomainProvision } from "@/lib/domains/provision-store-subdomain";
import { parseVariantFormInputs, parseVariantsJson } from "@/lib/products/variants";
import { syncProductVariants } from "@/lib/products/sync-variants";
import {
  applyLocationStocksFromForm,
  syncDefaultLocationStockFromVariant,
} from "@/lib/locations/sync-stock";
import { assertCanCreateProduct } from "@/lib/plans/product-limit";
import {
  applyFoodModifiersToMetadata,
  buildProductMetadata,
  parseExtraFieldsFromMetadata,
  parseExtraFieldsJson,
  pickExtraFieldValues,
} from "@/lib/products/extra-fields";
import {
  getStoreRubroTienda,
  resolveProductCategoryId,
  syncStoreProductCategories,
} from "@/lib/products/rubro-categories";
import { resolveProductFieldLabels } from "@/lib/products/resolve-product-field-labels";
import {
  getProductCategoriesForRubro,
  normalizeStoreRubro,
} from "@/src/config/categories";
import {
  storeRubroManagesProductVariants,
  storeUsesRubroProductModule,
} from "@/lib/rubros/registry";
import {
  parseFoodModifiersFromMetadata,
  type FoodModifiersConfig,
} from "@/lib/rubros/modules/alimentos";
import {
  applyPCBuilderSlotToMetadata,
  parsePCBuilderSlotFromMetadata,
  type PCBuilderSlotId,
} from "@/lib/rubros/modules/tecnologia/pc-builder";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import {
  STATIONERY_FIELD_UNITS_PER_PACK,
  STATIONERY_METADATA_KEY,
  buildStationeryMetadataPatch,
} from "@/lib/rubros/modules/papeleria-libreria-oficina/config";
import { areStationerySaleVariants } from "@/lib/rubros/modules/papeleria-libreria-oficina/variants";
import type { ProductEditImage } from "@/lib/products/product-gallery-types";
import {
  createProductImagesFromFormData,
  syncProductImagesFromFormData,
} from "@/lib/products/sync-product-images";

function mergeStationeryProductMetadata(
  metadata: Record<string, unknown>,
  extraFields: Record<string, string>,
  variants: import("@/lib/products/variants").ProductVariantJson[],
): Record<string, unknown> {
  const patch = buildStationeryMetadataPatch(
    extraFields,
    areStationerySaleVariants(variants),
  );
  const next = { ...metadata };
  if (!patch) {
    delete next[STATIONERY_METADATA_KEY];
    return next;
  }
  return { ...next, ...patch };
}

async function applyStationeryUnifiedStock(
  supabase: SupabaseClient,
  storeId: string,
  defaultVariantId: string,
  stockQuantity: number,
  formData: FormData,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("product_variants")
    .update({ stock_quantity: stockQuantity })
    .eq("id", defaultVariantId);

  if (error) return { error: error.message };

  return applyLocationStocksFromForm(
    supabase,
    storeId,
    defaultVariantId,
    formData,
    stockQuantity,
  );
}

function parseStockQuantityFromForm(
  formData: FormData,
  requiresStock: boolean,
): { stockQuantity: number } | { error: string } {
  if (!requiresStock) {
    return { stockQuantity: 0 };
  }

  const stockRaw = String(formData.get("stock_quantity") ?? "").trim();
  if (!stockRaw) {
    return { error: "Ingresa la cantidad en stock disponible." };
  }

  const stockQuantity = parseInt(stockRaw, 10);
  if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
    return { error: "Ingresa un stock válido (0 o más)." };
  }

  return { stockQuantity };
}

function parseCompareAtUsdFromForm(
  formData: FormData,
  priceUsd: number,
): { compareAtUsd?: number | null; error?: string } {
  const raw = String(formData.get("compare_at_usd") ?? "").trim();
  if (!raw) return { compareAtUsd: null };

  const compareAtUsd = parseFloat(raw);
  if (!Number.isFinite(compareAtUsd) || compareAtUsd < 0) {
    return { error: "Ingresa un precio regular válido." };
  }

  if (compareAtUsd > 0 && compareAtUsd <= priceUsd) {
    return {
      error:
        "El precio regular debe ser mayor al precio de venta para mostrar la oferta.",
    };
  }

  return { compareAtUsd: compareAtUsd > 0 ? compareAtUsd : null };
}

function parseWholesaleFromForm(
  formData: FormData,
  priceUsd: number,
): {
  wholesalePriceUsd?: number | null;
  wholesaleMinQty?: number | null;
  error?: string;
} {
  const priceRaw = String(formData.get("wholesale_price_usd") ?? "").trim();
  const minQtyRaw = String(formData.get("wholesale_min_qty") ?? "").trim();

  if (!priceRaw && !minQtyRaw) {
    return { wholesalePriceUsd: null, wholesaleMinQty: null };
  }

  if (!priceRaw || !minQtyRaw) {
    return {
      error:
        "Para precio al mayor, indica tanto el precio mayorista como la cantidad mínima.",
    };
  }

  const wholesalePriceUsd = parseFloat(priceRaw);
  const wholesaleMinQty = parseInt(minQtyRaw, 10);

  if (!Number.isFinite(wholesalePriceUsd) || wholesalePriceUsd < 0) {
    return { error: "Ingresa un precio mayorista válido." };
  }
  if (!Number.isFinite(wholesaleMinQty) || wholesaleMinQty < 2) {
    return { error: "La cantidad mínima para precio mayor debe ser 2 o más." };
  }
  if (wholesalePriceUsd >= priceUsd) {
    return {
      error: "El precio mayorista debe ser menor al precio de detal.",
    };
  }

  return { wholesalePriceUsd, wholesaleMinQty };
}

async function parseWholesaleForStore(
  supabase: SupabaseClient,
  storeId: string,
  formData: FormData,
  priceUsd: number,
): Promise<{
  wholesalePriceUsd?: number | null;
  wholesaleMinQty?: number | null;
  error?: string;
  applyWholesale: boolean;
}> {
  const settings = await getStoreSettingsConfig(storeId);
  if (!settings.catalogCurrency.wholesaleEnabled) {
    return { applyWholesale: false };
  }

  const parsed = parseWholesaleFromForm(formData, priceUsd);
  if (parsed.error) {
    return { ...parsed, applyWholesale: true };
  }

  return { ...parsed, applyWholesale: true };
}

async function getNextProductSortOrder(
  supabase: SupabaseClient,
  storeId: string,
): Promise<number> {
  const { data: minSortRow } = await supabase
    .from("products")
    .select("sort_order")
    .eq("store_id", storeId)
    .eq("is_deleted", false)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (minSortRow?.sort_order ?? 0) - 1;
}

export type ProductFormState = {
  error?: string;
  success?: boolean;
  catalogUrl?: string;
  productSlug?: string;
  productName?: string;
  imageOptimizedMessage?: string;
  productId?: string;
  /** URL pública de la miniatura principal tras la subida. */
  thumbUrl?: string;
  limitHit?: boolean;
  trialEligible?: boolean;
};

export interface ProductEditData {
  productId: string;
  name: string;
  shortDescription: string;
  description: string;
  priceUsd: number;
  compareAtUsd: number | null;
  wholesalePriceUsd: number | null;
  wholesaleMinQty: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
  categoryId: string;
  categorySlug: string;
  defaultVariantId: string;
  variants: import("@/lib/products/variants").ProductVariantJson[];
  thumbUrl: string | null;
  images: ProductEditImage[];
  extraFields: Record<string, string>;
  foodModifiers: FoodModifiersConfig;
  pcBuilderSlot: PCBuilderSlotId | null;
}

export type StoreFormState = {
  error?: string;
  success?: boolean;
};

async function getSupabase(): Promise<SupabaseClient> {
  return createClient();
}

async function resolveProductCategoryFromForm(
  supabase: SupabaseClient,
  storeId: string,
  formData: FormData,
): Promise<{ categoryId?: string; categorySlug?: string; error?: string }> {
  const rubro = await getStoreRubroTienda(supabase, storeId);
  const submittedSlug = String(formData.get("product_category_slug") ?? "").trim();
  const customCategoryName = String(formData.get("custom_category_name") ?? "").trim();
  const categorySlug =
    submittedSlug || getProductCategoriesForRubro(rubro)[0]?.slug || "general";

  const resolved = await resolveProductCategoryId(
    supabase,
    storeId,
    rubro,
    categorySlug,
    customCategoryName,
  );
  if (resolved.error || !resolved.categoryId) {
    return { error: resolved.error ?? "No se pudo asignar la categoría." };
  }

  return { categoryId: resolved.categoryId, categorySlug };
}

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  void formData;
  return {
    error:
      "El catálogo es solo dropshipping: añade productos desde el hub mayorista en Catálogo.",
  };
}

export async function getProductForEdit(productId: string): Promise<ProductEditData | null> {
  const supabase = await getSupabase();
  const store = await getUserStore(supabase);
  if (!store) return null;

  const { data: product, error: productError } = await supabase
    .from("products")
    .select(
      "id, name, short_description, description, category_id, metadata, variants, product_images(id, thumb_url, is_primary, sort_order), categories(slug)",
    )
    .eq("id", productId)
    .eq("store_id", store.id)
    .eq("is_deleted", false)
    .maybeSingle();

  if (productError || !product) return null;

  const { data: defaultVariant, error: variantError } = await supabase
    .from("product_variants")
    .select("id, stock_quantity, low_stock_threshold")
    .eq("product_id", productId)
    .eq("is_default", true)
    .maybeSingle();

  if (variantError || !defaultVariant) return null;

  const { data: priceRow } = await supabase
    .from("product_prices")
    .select("amount_usd, compare_at_usd, wholesale_price_usd, wholesale_min_qty")
    .eq("variant_id", defaultVariant.id)
    .maybeSingle();

  const images = ((product.product_images ?? []) as {
    id: string;
    thumb_url: string;
    is_primary: boolean;
    sort_order: number;
  }[])
    .slice()
    .sort((a, b) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
      return a.sort_order - b.sort_order || a.id.localeCompare(b.id);
    });
  const primaryImage = images.find((img) => img.is_primary) ?? images[0];
  const editImages: ProductEditImage[] = images.map((img, index) => ({
    id: img.id,
    thumbUrl: img.thumb_url,
    sortOrder: img.sort_order ?? index,
    isPrimary: img.is_primary,
  }));
  const rubro = await getStoreRubroTienda(supabase, store.id);
  const categoryRelation = product.categories as { slug: string } | { slug: string }[] | null;
  const categorySlug = Array.isArray(categoryRelation)
    ? categoryRelation[0]?.slug
    : categoryRelation?.slug;
  const resolvedCategorySlug =
    categorySlug ?? getProductCategoriesForRubro(rubro)[0]?.slug ?? "general";
  const fieldLabels = resolveProductFieldLabels(rubro, resolvedCategorySlug);
  const storedExtraFields = parseExtraFieldsFromMetadata(
    product.metadata as Record<string, unknown> | null,
  );

  return {
    productId: product.id as string,
    name: product.name as string,
    shortDescription: (product.short_description as string | null) ?? "",
    description: (product.description as string | null) ?? "",
    priceUsd: Number(priceRow?.amount_usd ?? 0),
    compareAtUsd:
      priceRow?.compare_at_usd != null
        ? Number(priceRow.compare_at_usd)
        : null,
    wholesalePriceUsd:
      priceRow?.wholesale_price_usd != null
        ? Number(priceRow.wholesale_price_usd)
        : null,
    wholesaleMinQty:
      priceRow?.wholesale_min_qty != null
        ? Number(priceRow.wholesale_min_qty)
        : null,
    stockQuantity: Number(defaultVariant.stock_quantity ?? 0),
    lowStockThreshold: Number(defaultVariant.low_stock_threshold ?? 5),
    categoryId: product.category_id as string,
    categorySlug: resolvedCategorySlug,
    defaultVariantId: defaultVariant.id as string,
    variants: parseVariantsJson(product.variants),
    thumbUrl: primaryImage?.thumb_url ?? null,
    images: editImages,
    extraFields: pickExtraFieldValues(storedExtraFields, fieldLabels),
    foodModifiers: parseFoodModifiersFromMetadata(
      product.metadata as Record<string, unknown> | null,
    ),
    pcBuilderSlot: parsePCBuilderSlotFromMetadata(
      product.metadata as Record<string, unknown> | null,
    ),
  };
}

export async function updateProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  void formData;
  return {
    error:
      "En dropshipping puro no se editan productos locales. Gestiona el catálogo desde el hub mayorista.",
  };
}

export async function createStore(
  _prev: StoreFormState,
  formData: FormData,
): Promise<StoreFormState> {
  const supabase = await getSupabase();
  const auth = await requireAuthUser(supabase);
  if (!auth.ok) return { error: auth.error };

  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();

  if (!name) return { error: "El nombre de la tienda es obligatorio." };

  const slugValidation = validateStoreSlugCandidate(slugInput || name);
  if (!slugValidation.ok) return { error: slugValidation.error };
  const slug = slugValidation.slug;

  const { data: existingStore, error: slugLookupError } = await supabase
    .from("stores")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (slugLookupError) {
    return { error: slugLookupError.message };
  }

  if (existingStore) {
    return { error: STORE_SLUG_UNAVAILABLE_MESSAGE };
  }

  const { data: store, error } = await supabase.from("stores").insert({
    owner_id: auth.authUser.id,
    name,
    slug,
  }).select("id, rubro_tienda").single();

  if (error) {
    if (error.code === "23505") {
      return { error: STORE_SLUG_UNAVAILABLE_MESSAGE };
    }
    return { error: error.message };
  }

  scheduleStoreSubdomainProvision({ storeId: store.id, slug });

  await syncStoreProductCategories(
    supabase,
    store.id,
    store.rubro_tienda as string | null,
  );

  revalidatePath("/dashboard/productos/nuevo");
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/inventario");
  revalidatePath(`/c/${slug}`);

  return { success: true };
}

export async function getStoreCategories(storeId: string) {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export type DeleteProductState = {
  error?: string;
  success?: boolean;
};

export async function deleteProduct(productId: string): Promise<DeleteProductState> {
  const supabase = await getSupabase();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const { store } = auth;

  const { data: product, error: lookupError } = await supabase
    .from("products")
    .select("id, is_deleted")
    .eq("id", productId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (lookupError) return { error: lookupError.message };
  if (!product) return { error: "Producto no encontrado." };
  if (product.is_deleted) return { success: true };

  const { error } = await supabase
    .from("products")
    .update({
      is_deleted: true,
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("store_id", store.id);

  if (error) return { error: error.message };

  revalidateInventoryPaths(store.slug);
  return { success: true };
}

export async function fetchInventoryProducts(options?: {
  offset?: number;
  limit?: number;
  stockFilter?: import("@/lib/inventory/stock-status").CatalogStockFilter;
  search?: string;
}): Promise<{
  products: import("@/lib/database.types").CatalogListItem[];
  totalCount: number;
  hasMore: boolean;
  error?: string;
}> {
  const supabase = await getSupabase();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) {
    return { products: [], totalCount: 0, hasMore: false, error: auth.error };
  }

  const { getStoreInventory, INVENTORY_PAGE_SIZE } = await import("@/lib/inventory");
  const { withTimeoutFallback } = await import("@/lib/async/with-timeout-fallback");
  const { products, totalCount, hasMore, inventoryError } = await withTimeoutFallback(
    getStoreInventory(auth.store.slug, {
      offset: options?.offset ?? 0,
      limit: options?.limit ?? INVENTORY_PAGE_SIZE,
      stockFilter: options?.stockFilter,
      search: options?.search,
    }),
    12_000,
    {
      products: [],
      exchangeRate: null,
      totalCount: 0,
      hasMore: false,
      inventoryError: "timeout",
    },
    "fetchInventoryProducts",
  );
  return {
    products,
    totalCount,
    hasMore,
    error:
      inventoryError === "timeout"
        ? "La carga del inventario tardó demasiado. Intenta de nuevo."
        : inventoryError,
  };
}

export async function reorderProducts(
  orderedProductIds: string[],
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await getSupabase();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const uniqueIds = [...new Set(orderedProductIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { error: "No hay productos para reordenar." };
  }

  const { data: storeProducts, error: lookupError } = await supabase
    .from("products")
    .select("id")
    .eq("store_id", auth.store.id)
    .eq("is_deleted", false)
    .in("id", uniqueIds);

  if (lookupError) return { error: lookupError.message };

  const ownedIds = new Set((storeProducts ?? []).map((row) => row.id as string));
  if (ownedIds.size !== uniqueIds.length) {
    return { error: "No se pudo reordenar: producto no válido." };
  }

  const updates = uniqueIds.map((productId, index) =>
    supabase
      .from("products")
      .update({ sort_order: index })
      .eq("id", productId)
      .eq("store_id", auth.store.id),
  );

  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);
  if (failed?.error) return { error: failed.error.message };

  revalidateInventoryPaths(auth.store.slug);
  return { success: true };
}

export type InventoryActionState = {
  error?: string;
  success?: boolean;
  stock?: number;
  limitHit?: boolean;
  trialEligible?: boolean;
};

async function assertStoreProductVariant(
  supabase: SupabaseClient,
  storeId: string,
  productId: string,
  variantId: string,
): Promise<{ error?: string } | { ok: true }> {
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("store_id", storeId)
    .eq("is_deleted", false)
    .maybeSingle();

  if (productError) return { error: productError.message };
  if (!product) return { error: "Producto no encontrado." };

  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .select("id")
    .eq("id", variantId)
    .eq("product_id", productId)
    .maybeSingle();

  if (variantError) return { error: variantError.message };
  if (!variant) return { error: "Variante no encontrada." };

  return { ok: true };
}

function revalidatePublicCatalogPaths(storeSlug: string) {
  revalidatePath(`/tienda/${storeSlug}`);
  revalidatePath(`/tienda/${storeSlug}/armar-pc`);
  revalidatePath(`/c/${storeSlug}`);
  revalidatePath(`/c/${storeSlug}/armar-pc`);
}

function revalidateInventoryPaths(storeSlug: string) {
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/inventario");
  revalidatePath("/dashboard");
  revalidatePublicCatalogPaths(storeSlug);
  revalidatePath("/dashboard/productos/nuevo");
}

export async function updateProductStock(
  productId: string,
  variantId: string,
  stockQuantity: number,
): Promise<InventoryActionState> {
  void productId;
  void variantId;
  void stockQuantity;
  return {
    error:
      "El stock lo gestiona el proveedor mayorista. No se edita desde la tienda.",
  };
}

export async function adjustProductStock(
  productId: string,
  delta: number,
): Promise<InventoryActionState> {
  void productId;
  void delta;
  return {
    error:
      "El stock lo gestiona el proveedor mayorista. No se edita desde la tienda.",
  };
}

export async function updateProductPriceUsd(
  productId: string,
  variantId: string,
  priceUsd: number,
): Promise<InventoryActionState> {
  const supabase = await getSupabase();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const { store } = auth;

  if (!Number.isFinite(priceUsd) || priceUsd < 0) {
    return { error: "Precio inválido." };
  }

  const access = await assertStoreProductVariant(
    supabase,
    store.id,
    productId,
    variantId,
  );
  if ("error" in access) return { error: access.error };

  const { data: existingPrice, error: priceLookupError } = await supabase
    .from("product_prices")
    .select("id")
    .eq("variant_id", variantId)
    .maybeSingle();

  if (priceLookupError) return { error: priceLookupError.message };

  const { error } = existingPrice
    ? await supabase
        .from("product_prices")
        .update({ amount_usd: priceUsd })
        .eq("variant_id", variantId)
    : await supabase.from("product_prices").insert({
        variant_id: variantId,
        amount_usd: priceUsd,
      });

  if (error) return { error: error.message };

  revalidateInventoryPaths(store.slug);
  return { success: true };
}

export async function duplicateProduct(
  productId: string,
): Promise<InventoryActionState> {
  const supabase = await getSupabase();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const { store } = auth;

  const productLimitCheck = await assertCanCreateProduct(store.id);
  if (!productLimitCheck.ok) {
    return {
      error: productLimitCheck.error,
      limitHit: productLimitCheck.code === "PRODUCT_LIMIT",
      trialEligible: productLimitCheck.trialEligible,
    };
  }

  const { data: source, error: sourceError } = await supabase
    .from("products")
    .select(
      "id, name, slug, short_description, description, category_id, brand, is_featured",
    )
    .eq("id", productId)
    .eq("store_id", store.id)
    .eq("is_deleted", false)
    .maybeSingle();

  if (sourceError) return { error: sourceError.message };
  if (!source) return { error: "Producto no encontrado." };

  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .select("id, sku, name, stock_quantity, is_default")
    .eq("product_id", productId)
    .eq("is_default", true)
    .maybeSingle();

  if (variantError) return { error: variantError.message };
  if (!variant) return { error: "No se encontró la variante del producto." };

  const { data: priceRow } = await supabase
    .from("product_prices")
    .select("amount_usd, compare_at_usd, wholesale_price_usd, wholesale_min_qty")
    .eq("variant_id", variant.id)
    .maybeSingle();

  const { data: imageRows } = await supabase
    .from("product_images")
    .select(
      "thumb_url, medium_url, full_url, alt_text, mime_type, byte_size, width, height, blur_hash, sort_order, is_primary",
    )
    .eq("product_id", productId)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true });

  const copyName = `${source.name} (copia)`;
  let productSlug = "";
  let newProductId = "";

  for (let attempt = 0; attempt < 3; attempt++) {
    productSlug =
      attempt === 0
        ? await allocateUniqueProductSlug(supabase, store.id, copyName, {
            fallbackBase: "producto-copia",
          })
        : await allocateUniqueProductSlug(
            supabase,
            store.id,
            `${copyName}-${randomProductSlugSuffix(5)}`,
            { fallbackBase: "producto-copia" },
          );

    const { data: newProduct, error: insertError } = await supabase
      .from("products")
      .insert({
        store_id: store.id,
        category_id: source.category_id,
        name: copyName,
        slug: productSlug,
        short_description: source.short_description,
        description: source.description,
        brand: source.brand,
        is_featured: false,
      })
      .select("id")
      .single();

    if (!insertError && newProduct) {
      newProductId = newProduct.id as string;
      break;
    }

    if (
      !insertError ||
      !isProductSlugUniqueViolation(insertError) ||
      attempt === 2
    ) {
      return { error: insertError?.message ?? "No se pudo duplicar el producto." };
    }
  }

  if (!newProductId) {
    return { error: "No se pudo duplicar el producto." };
  }
  const sku = `${store.slug}-${productSlug}`.slice(0, 80);

  const { data: newVariant, error: newVariantError } = await supabase
    .from("product_variants")
    .insert({
      product_id: newProductId,
      sku,
      name: variant.name ?? "Estándar",
      stock_quantity: variant.stock_quantity ?? 0,
      is_default: true,
    })
    .select("id")
    .single();

  if (newVariantError) return { error: newVariantError.message };

  if (priceRow?.amount_usd != null) {
    const { error: priceError } = await supabase.from("product_prices").insert({
      variant_id: newVariant.id,
      amount_usd: priceRow.amount_usd,
      compare_at_usd: priceRow.compare_at_usd,
    });
    if (priceError) return { error: priceError.message };
  }

  if (imageRows && imageRows.length > 0) {
    await supabase.from("product_images").insert(
      imageRows.map((imageRow, index) => ({
        product_id: newProductId,
        thumb_url: imageRow.thumb_url,
        medium_url: imageRow.medium_url,
        full_url: imageRow.full_url,
        is_primary: imageRow.is_primary ?? index === 0,
        sort_order: imageRow.sort_order ?? index,
        alt_text: copyName,
        mime_type: imageRow.mime_type,
        byte_size: imageRow.byte_size,
        width: imageRow.width,
        height: imageRow.height,
        blur_hash: imageRow.blur_hash,
      })),
    );
  }

  revalidateInventoryPaths(store.slug);
  return { success: true };
}
