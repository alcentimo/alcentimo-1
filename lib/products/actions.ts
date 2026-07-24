"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore, requireAuthUser } from "@/lib/auth/require-dashboard-auth";
import { getUserStore } from "@/lib/stores";
import { slugify, uniqueSlug } from "@/lib/slugify";
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
} from "@/lib/products/rubro-categories";
import {
  getExtraFieldsForProductCategory,
  getProductCategoriesForRubro,
  normalizeStoreRubro,
} from "@/src/config/categories";
import {
  filterExtraFieldsForActiveModule,
  storeRubroManagesProductVariants,
  storeUsesRubroProductModule,
} from "@/lib/rubros/registry";
import {
  parseFoodModifiersFromMetadata,
  type FoodModifiersConfig,
} from "@/lib/rubros/modules/alimentos";
import { getTechSpecLabels } from "@/lib/rubros/modules/tecnologia/config";
import { getCollectibleFieldLabels } from "@/lib/rubros/modules/coleccionables/config";
import { getBeautyFieldLabels } from "@/lib/rubros/modules/salud-belleza/config";
import { getStationeryFieldLabels } from "@/lib/rubros/modules/papeleria-libreria-oficina/config";
import type { ProductEditImage } from "@/lib/products/product-gallery-types";
import {
  createProductImagesFromFormData,
  syncProductImagesFromFormData,
} from "@/lib/products/sync-product-images";

function resolveProductFieldLabels(
  rubro: string,
  categorySlug: string,
): string[] {
  if (storeUsesRubroProductModule(rubro, "tecnologia")) {
    return getTechSpecLabels(null);
  }
  if (storeUsesRubroProductModule(rubro, "coleccionables")) {
    return getCollectibleFieldLabels();
  }
  if (storeUsesRubroProductModule(rubro, "salud-belleza")) {
    return getBeautyFieldLabels();
  }
  if (storeUsesRubroProductModule(rubro, "papeleria-libreria-oficina")) {
    return getStationeryFieldLabels(categorySlug);
  }
  const normalized = normalizeStoreRubro(rubro);
  return filterExtraFieldsForActiveModule(
    normalized,
    getExtraFieldsForProductCategory(normalized, categorySlug),
  );
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
  const supabase = await getSupabase();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return { error: auth.error };
  }

  const { store } = auth;

  // Ignorar store_id del cliente; usar siempre la tienda de la sesión
  const _clientStoreId = String(formData.get("store_id") ?? "");
  if (_clientStoreId && _clientStoreId !== store.id) {
    return { error: "No tienes permiso para publicar en esta tienda." };
  }

  const productLimitCheck = await assertCanCreateProduct(store.id);
  if (!productLimitCheck.ok) {
    return {
      error: productLimitCheck.error,
      limitHit: productLimitCheck.code === "PRODUCT_LIMIT",
      trialEligible: productLimitCheck.trialEligible,
    };
  }

  const name = String(formData.get("name") ?? "").trim();
  const shortDescription = String(
    formData.get("short_description") ?? "",
  ).trim();
  const description = String(formData.get("description") ?? "").trim();
  const priceUsd = parseFloat(String(formData.get("price_usd") ?? ""));
  const stockQuantity = parseInt(String(formData.get("stock_quantity") ?? "0"), 10);
  const lowStockThreshold = parseInt(
    String(formData.get("low_stock_threshold") ?? "5"),
    10,
  );
  const imageFile = formData.get("image");
  const hasGalleryUpload =
    formData.getAll("images").some((entry) => entry instanceof File && entry.size > 0) ||
    (imageFile instanceof File && imageFile.size > 0);
  const variantsRaw = String(formData.get("variants_json") ?? "");
  const parsedVariants = parseVariantFormInputs(variantsRaw);
  if (parsedVariants.error) return { error: parsedVariants.error };
  const customVariants = parsedVariants.variants;
  const hasCustomVariants = customVariants.length > 0;

  if (!name) return { error: "El nombre es obligatorio." };
  if (!Number.isFinite(priceUsd) || priceUsd < 0) {
    return { error: "Ingresa un precio USD válido." };
  }
  const compareAtParsed = parseCompareAtUsdFromForm(formData, priceUsd);
  if (compareAtParsed.error) return { error: compareAtParsed.error };
  if (!hasCustomVariants) {
    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
      return { error: "Ingresa un stock válido (0 o más)." };
    }
  }
  if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) {
    return { error: "Ingresa un umbral de alerta válido (0 o más)." };
  }

  const rubro = await getStoreRubroTienda(supabase, store.id);
  const categoryResolved = await resolveProductCategoryFromForm(
    supabase,
    store.id,
    formData,
  );
  if (categoryResolved.error || !categoryResolved.categoryId) {
    return { error: categoryResolved.error ?? "No se pudo asignar la categoría." };
  }
  const categoryId = categoryResolved.categoryId;
  const categorySlug = categoryResolved.categorySlug ?? "general";

  const extraFieldsParsed = parseExtraFieldsJson(
    String(formData.get("extra_fields_json") ?? ""),
  );
  if (extraFieldsParsed.error) return { error: extraFieldsParsed.error };
  const fieldLabels = resolveProductFieldLabels(rubro, categorySlug);
  let metadata = buildProductMetadata(
    null,
    extraFieldsParsed.fields,
    fieldLabels,
  );

  if (storeUsesRubroProductModule(rubro, "alimentos")) {
    const withModifiers = applyFoodModifiersToMetadata(
      metadata,
      String(formData.get("food_modifiers_json") ?? ""),
    );
    if (withModifiers.error) return { error: withModifiers.error };
    metadata = withModifiers.metadata;
  }

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .eq("id", categoryId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (categoryError) return { error: categoryError.message };
  if (!category) {
    return { error: "La categoría no pertenece a tu tienda." };
  }

  let productSlug = slugify(name) || "producto";
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? productSlug : uniqueSlug(name, crypto.randomUUID());
    const { data: taken } = await supabase
      .from("products")
      .select("id")
      .eq("store_id", store.id)
      .eq("slug", candidate)
      .eq("is_deleted", false)
      .maybeSingle();
    if (!taken) {
      productSlug = candidate;
      break;
    }
  }

  const sortOrder = await getNextProductSortOrder(supabase, store.id);

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      store_id: store.id,
      category_id: categoryId,
      name,
      slug: productSlug,
      short_description: shortDescription || null,
      description: description || null,
      metadata,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (productError) return { error: productError.message };

  const productId = product.id as string;
  const sku = `${store.slug}-${productSlug}`.slice(0, 80);

  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .insert({
      product_id: productId,
      sku,
      name: hasCustomVariants ? "Base" : "Estándar",
      stock_quantity: hasCustomVariants ? 0 : stockQuantity,
      low_stock_threshold: lowStockThreshold,
      is_default: true,
    })
    .select("id")
    .single();

  if (variantError) return { error: variantError.message };

  const variantId = variant.id as string;

  if (!hasCustomVariants) {
    const locationStock = await applyLocationStocksFromForm(
      supabase,
      store.id,
      variantId,
      formData,
      stockQuantity,
    );
    if (locationStock.error) return { error: locationStock.error };
  }

  const { error: priceError } = await supabase.from("product_prices").insert({
    variant_id: variantId,
    amount_usd: priceUsd,
    compare_at_usd: compareAtParsed.compareAtUsd ?? null,
  });

  if (priceError) return { error: priceError.message };

  if (hasCustomVariants) {
    const synced = await syncProductVariants(supabase, {
      productId,
      storeSlug: store.slug,
      productSlug,
      basePriceUsd: priceUsd,
      lowStockThreshold,
      variants: customVariants,
      defaultVariantId: variantId,
      storeId: store.id,
    });
    if (synced.error) return { error: synced.error };
  }

  if (hasGalleryUpload) {
    const imageResult = await createProductImagesFromFormData(
      supabase,
      store.id,
      productId,
      formData,
      name,
    );

    if (imageResult.error) return { error: imageResult.error };

    revalidatePath(`/tienda/${store.slug}`);
    revalidatePath(`/c/${store.slug}`);
    revalidatePath("/dashboard/productos/nuevo");
    revalidatePath("/dashboard/catalogo");
    revalidatePath("/dashboard/inventario");

    return {
      success: true,
      catalogUrl: `/c/${store.slug}`,
      productSlug,
      productName: name,
      imageOptimizedMessage:
        imageResult.uploadedCount > 1
          ? `${imageResult.uploadedCount} imágenes subidas correctamente.`
          : undefined,
    };
  }

  return {
    error: "Sube al menos una foto del producto.",
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
    .select("amount_usd, compare_at_usd")
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
  };
}

export async function updateProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const supabase = await getSupabase();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const { store } = auth;

  const productId = String(formData.get("product_id") ?? "").trim();
  if (!productId) return { error: "Producto no válido." };

  const { data: existingProduct, error: lookupError } = await supabase
    .from("products")
    .select("id, slug, metadata")
    .eq("id", productId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (lookupError) return { error: lookupError.message };
  if (!existingProduct) return { error: "Producto no encontrado." };

  const name = String(formData.get("name") ?? "").trim();
  const shortDescription = String(formData.get("short_description") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priceUsd = parseFloat(String(formData.get("price_usd") ?? ""));
  const stockQuantity = parseInt(String(formData.get("stock_quantity") ?? "0"), 10);
  const lowStockThreshold = parseInt(
    String(formData.get("low_stock_threshold") ?? "5"),
    10,
  );
  const categoryResolved = await resolveProductCategoryFromForm(
    supabase,
    store.id,
    formData,
  );
  if (categoryResolved.error || !categoryResolved.categoryId) {
    return { error: categoryResolved.error ?? "No se pudo asignar la categoría." };
  }
  const categoryId = categoryResolved.categoryId;
  const categorySlug = categoryResolved.categorySlug ?? "general";
  const defaultVariantId = String(formData.get("default_variant_id") ?? "").trim();
  const variantsRaw = String(formData.get("variants_json") ?? "");
  const imageFile = formData.get("image");
  const hasGalleryUpload =
    formData.getAll("images").some((entry) => entry instanceof File && entry.size > 0) ||
    (imageFile instanceof File && imageFile.size > 0);
  const parsedVariants = parseVariantFormInputs(variantsRaw);
  if (parsedVariants.error) return { error: parsedVariants.error };
  const customVariants = parsedVariants.variants;
  const hasCustomVariants = customVariants.length > 0;

  if (!name) return { error: "El nombre es obligatorio." };
  if (!Number.isFinite(priceUsd) || priceUsd < 0) {
    return { error: "Ingresa un precio USD válido." };
  }
  const compareAtParsed = parseCompareAtUsdFromForm(formData, priceUsd);
  if (compareAtParsed.error) return { error: compareAtParsed.error };
  if (!hasCustomVariants && (!Number.isFinite(stockQuantity) || stockQuantity < 0)) {
    return { error: "Ingresa un stock válido (0 o más)." };
  }
  if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) {
    return { error: "Ingresa un umbral de alerta válido (0 o más)." };
  }
  if (!categoryId) return { error: "Selecciona una categoría." };
  if (!defaultVariantId) return { error: "Variante base no encontrada." };

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .eq("id", categoryId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (categoryError) return { error: categoryError.message };
  if (!category) return { error: "La categoría no pertenece a tu tienda." };

  const rubro = await getStoreRubroTienda(supabase, store.id);
  const extraFieldsParsed = parseExtraFieldsJson(
    String(formData.get("extra_fields_json") ?? ""),
  );
  if (extraFieldsParsed.error) return { error: extraFieldsParsed.error };
  const fieldLabels = resolveProductFieldLabels(rubro, categorySlug);
  let metadata = buildProductMetadata(
    existingProduct.metadata as Record<string, unknown> | null,
    extraFieldsParsed.fields,
    fieldLabels,
  );

  if (storeUsesRubroProductModule(rubro, "alimentos")) {
    const withModifiers = applyFoodModifiersToMetadata(
      metadata,
      String(formData.get("food_modifiers_json") ?? ""),
    );
    if (withModifiers.error) return { error: withModifiers.error };
    metadata = withModifiers.metadata;
  }

  const { error: productUpdateError } = await supabase
    .from("products")
    .update({
      name,
      short_description: shortDescription || null,
      description: description || null,
      category_id: categoryId,
      metadata,
    })
    .eq("id", productId)
    .eq("store_id", store.id);

  if (productUpdateError) return { error: productUpdateError.message };

  const { error: defaultVariantError } = await supabase
    .from("product_variants")
    .update({
      name: hasCustomVariants ? "Base" : "Estándar",
      stock_quantity: hasCustomVariants ? 0 : stockQuantity,
      low_stock_threshold: lowStockThreshold,
      is_default: true,
    })
    .eq("id", defaultVariantId)
    .eq("product_id", productId);

  if (defaultVariantError) return { error: defaultVariantError.message };

  if (!hasCustomVariants) {
    const locationStock = await applyLocationStocksFromForm(
      supabase,
      store.id,
      defaultVariantId,
      formData,
      stockQuantity,
    );
    if (locationStock.error) return { error: locationStock.error };
  }

  const priceUpdate = await supabase
    .from("product_prices")
    .update({
      amount_usd: priceUsd,
      compare_at_usd: compareAtParsed.compareAtUsd ?? null,
    })
    .eq("variant_id", defaultVariantId);

  if (priceUpdate.error) return { error: priceUpdate.error.message };

  if (hasCustomVariants) {
    const synced = await syncProductVariants(supabase, {
      productId,
      storeSlug: store.slug,
      productSlug: existingProduct.slug as string,
      basePriceUsd: priceUsd,
      lowStockThreshold,
      variants: customVariants,
      defaultVariantId,
      storeId: store.id,
    });
    if (synced.error) return { error: synced.error };
  } else if (storeRubroManagesProductVariants(rubro)) {
    await supabase.from("products").update({ variants: [] }).eq("id", productId);
  }

  if (hasGalleryUpload || formData.get("product_images_json")) {
    const imageResult = await syncProductImagesFromFormData(
      supabase,
      store.id,
      productId,
      formData,
      name,
    );
    if (imageResult.error) return { error: imageResult.error };

    if (imageResult.changed) {
      revalidateInventoryPaths(store.slug);
      return {
        success: true,
        catalogUrl: `/tienda/${store.slug}`,
        productId,
        imageOptimizedMessage:
          imageResult.uploadedCount > 1
            ? `${imageResult.uploadedCount} imágenes nuevas subidas.`
            : imageResult.uploadedCount === 1
              ? "Imagen actualizada correctamente."
              : undefined,
      };
    }
  }

  revalidateInventoryPaths(store.slug);
  revalidatePath(`/dashboard/productos/${productId}/editar`);
  return { success: true, catalogUrl: `/tienda/${store.slug}`, productId };
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
  const slug = slugify(slugInput || name);

  if (!name) return { error: "El nombre de la tienda es obligatorio." };
  if (!slug) return { error: "El slug no es válido." };

  const { error } = await supabase.from("stores").insert({
    owner_id: auth.authUser.id,
    name,
    slug,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Ese slug ya está en uso. Elige otro." };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/productos/nuevo");
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/inventario");

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
  const { products, totalCount, hasMore, inventoryError } = await getStoreInventory(
    auth.store.slug,
    {
      offset: options?.offset ?? 0,
      limit: options?.limit ?? INVENTORY_PAGE_SIZE,
      stockFilter: options?.stockFilter,
      search: options?.search,
    },
  );
  return { products, totalCount, hasMore, error: inventoryError };
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

function revalidateInventoryPaths(storeSlug: string) {
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/inventario");
  revalidatePath("/dashboard");
  revalidatePath(`/tienda/${storeSlug}`);
  revalidatePath(`/c/${storeSlug}`);
  revalidatePath("/dashboard/productos/nuevo");
}

export async function updateProductStock(
  productId: string,
  variantId: string,
  stockQuantity: number,
): Promise<InventoryActionState> {
  const supabase = await getSupabase();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const { store } = auth;

  if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
    return { error: "Stock inválido." };
  }

  const access = await assertStoreProductVariant(
    supabase,
    store.id,
    productId,
    variantId,
  );
  if ("error" in access) return { error: access.error };

  const locationSync = await syncDefaultLocationStockFromVariant(
    supabase,
    store.id,
    variantId,
    Math.floor(stockQuantity),
  );
  if (locationSync.error) return { error: locationSync.error };

  revalidateInventoryPaths(store.slug);
  return { success: true, stock: Math.floor(stockQuantity) };
}

export async function adjustProductStock(
  productId: string,
  delta: number,
): Promise<InventoryActionState> {
  const supabase = await getSupabase();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const { store } = auth;

  if (!Number.isFinite(delta) || delta === 0) {
    return { error: "Ajuste de stock no válido." };
  }

  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .select("id, stock_quantity")
    .eq("product_id", productId)
    .eq("is_default", true)
    .maybeSingle();

  if (variantError) return { error: variantError.message };
  if (!variant) return { error: "Variante del producto no encontrada." };

  const access = await assertStoreProductVariant(
    supabase,
    store.id,
    productId,
    variant.id as string,
  );
  if ("error" in access) return { error: access.error };

  const current = Number(variant.stock_quantity ?? 0);
  const nextStock = Math.max(0, Math.floor(current + delta));

  return updateProductStock(productId, variant.id as string, nextStock);
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
    .select("amount_usd, compare_at_usd")
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
  let productSlug = slugify(copyName) || "producto-copia";
  for (let i = 0; i < 5; i++) {
    const candidate =
      i === 0 ? productSlug : uniqueSlug(copyName, crypto.randomUUID());
    const { data: taken } = await supabase
      .from("products")
      .select("id")
      .eq("store_id", store.id)
      .eq("slug", candidate)
      .eq("is_deleted", false)
      .maybeSingle();
    if (!taken) {
      productSlug = candidate;
      break;
    }
  }

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

  if (insertError) return { error: insertError.message };

  const newProductId = newProduct.id as string;
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
